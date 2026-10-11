// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import assert from 'assert';
import { PackageJson } from '../lib/detect';
import {
    formatTestToolingReport,
    inspectTestTooling,
    MSW_WORKER_DIRECTORY,
    planPackageJsonAdditions,
    SCAFFOLD_STORYBOOK_MAJOR,
    storybookMajorOf,
    storybookPortOf,
    TEST_TOOLING_DEV_DEPENDENCIES,
} from '../lib/test-tooling';

const TEMPLATE: PackageJson = {
    devDependencies: {
        '@storybook/addon-interactions': '^7.0.2',
        '@storybook/jest': '^0.2.3',
        '@storybook/test-runner': '^0.16.0',
        msw: '^2.10.4',
        'msw-storybook-addon': '^2.0.5',
        playwright: '^1.40.0',
        'react-router-dom': '^6.16.0',
        typescript: '^5.0.2',
    },
    scripts: {
        'test-storybook': 'test-storybook --url http://127.0.0.1:6006',
        postinstall: 'playwright install chromium && msw init',
        build: 'webpack --mode production',
    },
    msw: { workerDirectory: ['.storybook/public'] },
};

const YEAR_OLD: PackageJson = {
    devDependencies: { '@storybook/addon-interactions': '^7.0.2', '@storybook/react': '7.6.17', typescript: '^5.0.2' },
    scripts: { build: 'webpack --mode production', storybook: 'storybook dev -p 6006' },
};

const CURRENT: PackageJson = {
    devDependencies: { ...TEMPLATE.devDependencies },
    scripts: { ...TEMPLATE.scripts },
    msw: { workerDirectory: ['.storybook/public'] },
};

describe('inspectTestTooling', () => {
    it('reports every missing item for a year-old project', () => {
        const report = inspectTestTooling(YEAR_OLD, () => false);
        const missing = report.items.filter((item) => !item.present).map((item) => item.label);

        assert.strictEqual(report.complete, false);
        assert.deepStrictEqual(missing, [
            'devDependency @storybook/jest',
            'devDependency @storybook/test-runner',
            'devDependency msw',
            'devDependency msw-storybook-addon',
            'devDependency playwright',
            'devDependency react-router-dom',
            'script test-storybook',
            "script postinstall running 'msw init'",
            `package.json msw.workerDirectory includes ${MSW_WORKER_DIRECTORY}`,
            'file test-runner-jest.config.js',
            'file src/mocks/evokeHandlers.ts',
        ]);
    });

    it('is complete for a current scaffold', () => {
        const report = inspectTestTooling(CURRENT, () => true);

        assert.strictEqual(report.complete, true);
        assert.ok(report.items.every((item) => item.present));
    });

    it('counts a tooling package under dependencies as present', () => {
        const { msw, ...devDependencies } = CURRENT.devDependencies!;
        const pkg: PackageJson = { ...CURRENT, dependencies: { msw }, devDependencies };
        const item = inspectTestTooling(pkg, () => true).items.find((i) => i.label === 'devDependency msw');

        assert.strictEqual(item?.present, true);
    });

    it('accepts msw.workerDirectory written as a plain string by msw 1.x', () => {
        const pkg: PackageJson = { ...CURRENT, msw: { workerDirectory: '.storybook/public' } };

        assert.strictEqual(inspectTestTooling(pkg, () => true).complete, true);
    });

    it('treats a postinstall script that lacks msw init as missing', () => {
        const pkg: PackageJson = { ...CURRENT, scripts: { ...CURRENT.scripts, postinstall: 'echo hi' } };
        const report = inspectTestTooling(pkg, () => true);

        assert.strictEqual(report.complete, false);
        assert.deepStrictEqual(
            report.items.filter((item) => !item.present).map((item) => item.label),
            ["script postinstall running 'msw init'"],
        );
    });
});

describe('planPackageJsonAdditions', () => {
    it('adds only the missing keys, never touching existing ones', () => {
        const additions = planPackageJsonAdditions(YEAR_OLD, TEMPLATE);

        assert.deepStrictEqual(additions, {
            devDependencies: {
                '@storybook/jest': '^0.2.3',
                '@storybook/test-runner': '^0.16.0',
                msw: '^2.10.4',
                'msw-storybook-addon': '^2.0.5',
                playwright: '^1.40.0',
                'react-router-dom': '^6.16.0',
            },
            scripts: {
                'test-storybook': 'test-storybook --url http://127.0.0.1:6006',
                postinstall: 'playwright install chromium && msw init',
            },
            msw: { workerDirectory: ['.storybook/public'] },
        });
        assert.ok(!('@storybook/addon-interactions' in additions.devDependencies!), 'present dep was re-added');
        assert.ok(!('build' in (additions.scripts ?? {})), 'unrelated template script leaked in');
    });

    it('does not re-declare a tooling package the project lists under dependencies', () => {
        const pkg: PackageJson = { ...YEAR_OLD, dependencies: { msw: '^1.0.0' } };
        const additions = planPackageJsonAdditions(pkg, TEMPLATE);

        assert.ok(!('msw' in (additions.devDependencies ?? {})), 'msw was declared a second time');
        assert.ok('playwright' in (additions.devDependencies ?? {}));
    });

    it('does not re-declare react-router-dom when the project lists it under dependencies', () => {
        const pkg: PackageJson = { ...YEAR_OLD, dependencies: { 'react-router-dom': '^6.0.0' } };
        const additions = planPackageJsonAdditions(pkg, TEMPLATE);

        assert.ok(!('react-router-dom' in (additions.devDependencies ?? {})), 'react-router-dom was declared twice');
        assert.ok('msw' in (additions.devDependencies ?? {}));
    });

    it('returns an empty object for a current scaffold', () => {
        assert.deepStrictEqual(planPackageJsonAdditions(CURRENT, TEMPLATE), {});
    });

    it('leaves an existing custom postinstall alone', () => {
        // Replacing a user's postinstall could delete a step they rely on. It is reported
        // and the closing message tells them what to append.
        const pkg: PackageJson = { ...YEAR_OLD, scripts: { ...YEAR_OLD.scripts, postinstall: 'echo hi' } };
        const additions = planPackageJsonAdditions(pkg, TEMPLATE);

        assert.ok(!('postinstall' in (additions.scripts ?? {})));
        assert.strictEqual(additions.scripts?.['test-storybook'], 'test-storybook --url http://127.0.0.1:6006');
    });

    it('keeps an existing msw.workerDirectory list and appends the storybook folder', () => {
        const pkg: PackageJson = { ...CURRENT, msw: { workerDirectory: ['public'] } };

        assert.deepStrictEqual(planPackageJsonAdditions(pkg, TEMPLATE), {
            msw: { workerDirectory: ['public', '.storybook/public'] },
        });
    });

    it('turns a string msw.workerDirectory into a list instead of splitting it into characters', () => {
        const pkg: PackageJson = { ...CURRENT, msw: { workerDirectory: 'public' } };

        assert.deepStrictEqual(planPackageJsonAdditions(pkg, TEMPLATE), {
            msw: { workerDirectory: ['public', '.storybook/public'] },
        });
    });

    it('covers every dependency the inspection looks for', () => {
        for (const name of TEST_TOOLING_DEV_DEPENDENCIES) {
            assert.ok(TEMPLATE.devDependencies![name], `${name} is not in the scaffold template`);
        }
    });
});

describe('formatTestToolingReport', () => {
    it('prints one checkbox line per item', () => {
        const lines = formatTestToolingReport({
            items: [
                { label: 'devDependency msw', present: true },
                { label: 'script test-storybook', present: false },
            ],
            complete: false,
        });

        assert.deepStrictEqual(lines, ['  [x] devDependency msw', '  [ ] script test-storybook']);
    });
});

describe('storybookPortOf', () => {
    const withScript = (storybook?: string): PackageJson => ({ scripts: storybook ? { storybook } : {} });

    it('reads the port from -p, --port and --port=', () => {
        assert.strictEqual(storybookPortOf(withScript('storybook dev -p 3000')), '3000');
        assert.strictEqual(storybookPortOf(withScript('storybook dev --port 3001')), '3001');
        assert.strictEqual(storybookPortOf(withScript('storybook dev --port=4000')), '4000');
        assert.strictEqual(storybookPortOf(withScript('storybook dev -p=4001')), '4001');
    });

    it('falls back to 6006 without a storybook script or a port flag', () => {
        assert.strictEqual(storybookPortOf({}), '6006');
        assert.strictEqual(storybookPortOf(withScript()), '6006');
        assert.strictEqual(storybookPortOf(withScript('storybook dev')), '6006');
    });
});

describe('planPackageJsonAdditions with a custom Storybook port', () => {
    it('points test-storybook at the project port', () => {
        const pkg: PackageJson = { ...YEAR_OLD, scripts: { ...YEAR_OLD.scripts, storybook: 'storybook dev -p 3000' } };

        assert.strictEqual(
            planPackageJsonAdditions(pkg, TEMPLATE).scripts?.['test-storybook'],
            'test-storybook --url http://127.0.0.1:3000',
        );
    });

    it('uses the template command unchanged when it has no default URL to replace', () => {
        const template: PackageJson = {
            ...TEMPLATE,
            scripts: { ...TEMPLATE.scripts, 'test-storybook': 'test-storybook' },
        };
        const pkg: PackageJson = { ...YEAR_OLD, scripts: { ...YEAR_OLD.scripts, storybook: 'storybook dev -p 3000' } };

        assert.strictEqual(planPackageJsonAdditions(pkg, template).scripts?.['test-storybook'], 'test-storybook');
    });
});

describe('storybookMajorOf', () => {
    it('reads the first integer of the storybook spec', () => {
        assert.strictEqual(storybookMajorOf({ devDependencies: { storybook: '^9.0.13' } }), 9);
        assert.strictEqual(storybookMajorOf({ devDependencies: { storybook: '~8.1.0' } }), 8);
        assert.strictEqual(storybookMajorOf({ devDependencies: { storybook: '7.6.17' } }), 7);
    });

    it('falls back to @storybook/react when storybook is not declared', () => {
        assert.strictEqual(storybookMajorOf({ devDependencies: { '@storybook/react': '>=7.0.0' } }), 7);
    });

    it('prefers storybook over @storybook/react', () => {
        const pkg: PackageJson = { devDependencies: { storybook: '^9.0.0', '@storybook/react': '^7.0.0' } };

        assert.strictEqual(storybookMajorOf(pkg), 9);
    });

    it('also looks in dependencies', () => {
        assert.strictEqual(storybookMajorOf({ dependencies: { storybook: '^8.0.0' } }), 8);
    });

    it('is undefined when neither package is declared', () => {
        assert.strictEqual(storybookMajorOf({}), undefined);
        assert.strictEqual(storybookMajorOf({ devDependencies: { typescript: '^5.0.2' } }), undefined);
    });

    it('is undefined when the spec has no digits', () => {
        assert.strictEqual(storybookMajorOf({ devDependencies: { storybook: 'latest' } }), undefined);
        assert.strictEqual(storybookMajorOf({ devDependencies: { storybook: '*' } }), undefined);
        assert.strictEqual(storybookMajorOf({ devDependencies: { storybook: 'next' } }), undefined);
    });

    it('treats Storybook 7 as the scaffold major', () => {
        assert.strictEqual(SCAFFOLD_STORYBOOK_MAJOR, 7);
    });
});

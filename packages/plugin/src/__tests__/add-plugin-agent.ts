// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import helpers, { RunResult } from 'yeoman-test';
import { importsAgentsFile } from '../lib/plugin-agent';
import {
    MID_ERA_CLAUDE_MD,
    MID_ERA_SKILL,
    YEAR_OLD_MAIN_TS,
    YEAR_OLD_PREVIEW_TS,
    writeCurrentProject,
    writeMidEraProject,
    writeYearOldProject,
} from './fixtures';

const skillNames = [
    'plan-widget',
    'build-widget',
    'plan-payment-gateway',
    'add-payment-gateway',
    'render-evoke-forms',
    'build-criteria-filters',
    'send-correspondence',
    'storybook-tdd',
    'review-accessibility',
    'review-behavioral',
    'review-performance',
];

const agentItems = (skills: 'claude' | 'agents') => [
    'AGENTS.md',
    'CLAUDE.md',
    'scripts/fetch-openapi-specs.sh',
    'plans/.gitkeep',
    ...skillNames.map((skill) => `.${skills}/skills/${skill}/SKILL.md`),
];

// Answers every prompt through options so a test only names what it is about.
const quiet = { skills: 'claude', 'env-url': '', 'add-test-tooling': false };

// Collects everything the generator prints. yeoman-environment sends this.log to stderr, so
// the 'ready' event (the generator instance, before it runs) is where the three print
// methods the generator uses can be wrapped. Returns the array lines are pushed into.
function captureLog(context: ReturnType<typeof helpers.run>): string[] {
    const lines: string[] = [];

    context.on('ready', (generator: { log: Record<'writeln' | 'ok' | 'write', (message?: string) => unknown> }) => {
        for (const method of ['writeln', 'ok', 'write'] as const) {
            const original = generator.log[method].bind(generator.log);

            generator.log[method] = (message?: string) => {
                lines.push(message ?? '');

                return original(message);
            };
        }
    });

    return lines;
}

describe('add-plugin-agent', () => {
    const generator = path.join(__dirname, '../generators/add-plugin-agent');
    let runResult: RunResult | undefined;

    afterEach(() => {
        runResult?.restore();
        runResult = undefined;
    });

    it('adds the five agent items to a year-old project without touching anything else', async () => {
        runResult = await helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);

        runResult.assertFile(agentItems('claude'));
        runResult.assertFileContent('AGENTS.md', '# tabs-unlimited');
        runResult.assertFileContent('AGENTS.md', 'Base URL: _not set_');
        runResult.assertFileContent('CLAUDE.md', '@AGENTS.md');
        runResult.assertNoFile(['.agents/skills/plan-widget/SKILL.md', 'INSTRUCTIONS.md', '.yo-rc.json']);

        // Untouched: widget source, storybook config, package.json.
        runResult.assertFileContent('src/widgets/Tabs/index.tsx', 'export default function Tabs()');
        runResult.assertNoFileContent('package.json', 'test-storybook');
        runResult.assertNoFile(['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts']);
    }).timeout(10000);

    it('puts skills under .agents/skills when asked', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ ...quiet, skills: 'agents' });

        runResult.assertFile(agentItems('agents'));
        runResult.assertNoFile(['.claude/skills/plan-widget/SKILL.md']);
    }).timeout(10000);

    it('reads the project name from package.json and the URL from --env-url', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir((dir) => writeYearOldProject(dir, '@acme/intake-widgets'))
            .withOptions({ ...quiet, 'env-url': 'https://acme.example.com/' });

        runResult.assertFileContent('AGENTS.md', '# @acme/intake-widgets');
        runResult.assertFileContent('AGENTS.md', 'Base URL: https://acme.example.com\n');
    }).timeout(10000);

    it('answers the two prompts when no options are given', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ 'add-test-tooling': false })
            .withPrompts({ skills: 'agents', environmentUrl: 'https://prompted.example.com' });

        runResult.assertFile('.agents/skills/plan-widget/SKILL.md');
        runResult.assertFileContent('AGENTS.md', 'Base URL: https://prompted.example.com');
    }).timeout(10000);

    it('merges .gitignore: original lines once, missing lines under one header', async () => {
        runResult = await helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);

        const content = fs.readFileSync(path.join(runResult.cwd, '.gitignore'), 'utf8');

        assert.ok(content.startsWith('node_modules/\ndist/\n'), content);
        assert.strictEqual(content.split('node_modules/').length - 1, 1);
        assert.strictEqual(content.split('# Added by @evoke-platform/plugin add-plugin-agent').length - 1, 1);
        assert.ok(content.includes('.openapi/'));
        assert.ok(content.includes('storybook-static/'));
        assert.ok(content.includes('storybook.pid'));
    }).timeout(10000);

    it('merges .gitignore and package.json without an overwrite prompt', async () => {
        // The year-old fixture has no agent files and no tooling files, so .gitignore and
        // package.json are the only existing files the generator touches. Every conflict
        // answer is 'abort': if either file reached the prompt, the run would reject.
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ ...quiet, force: false, 'add-test-tooling': true })
            .withPrompts({ action: 'abort' });

        const onDisk = (file: string) => fs.readFileSync(path.join(runResult!.cwd, file), 'utf8');
        const pkg = JSON.parse(onDisk('package.json'));

        assert.ok(onDisk('.gitignore').includes('# Added by @evoke-platform/plugin add-plugin-agent'));
        assert.ok(onDisk('.gitignore').includes('.openapi/'));
        assert.ok(pkg.scripts['test-storybook']);
        assert.ok(pkg.devDependencies.msw);
        assert.ok(fs.existsSync(path.join(runResult.cwd, 'test-runner-jest.config.js')));
    }).timeout(10000);

    it('leaves a customized CLAUDE.md and skill alone when the developer answers skip', async () => {
        // yeoman-test forces overwrites by default; turn that off so the conflict prompt
        // fires, and answer it the way a cautious developer would.
        runResult = await helpers
            .run(generator)
            .doInDir(writeMidEraProject)
            .withOptions({ ...quiet, force: false })
            .withPrompts({ action: 'skip' });

        // RunResult's assertions read Yeoman's in-memory store, which still holds the skipped
        // content. What the developer keeps is what is on disk, so read the disk.
        const onDisk = (file: string) => fs.readFileSync(path.join(runResult!.cwd, file), 'utf8');

        assert.strictEqual(onDisk('CLAUDE.md'), MID_ERA_CLAUDE_MD);
        assert.strictEqual(onDisk('.claude/skills/build-widget/SKILL.md'), MID_ERA_SKILL);
        assert.ok(fs.existsSync(path.join(runResult.cwd, 'AGENTS.md')));
        assert.ok(fs.existsSync(path.join(runResult.cwd, '.claude/skills/plan-widget/SKILL.md')));
        assert.ok(onDisk('AGENTS.md').includes('# tabs-unlimited'));
    }).timeout(10000);

    it('replaces a customized CLAUDE.md with the import when forced', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeMidEraProject)
            .withOptions({ ...quiet, force: true });

        runResult.assertFileContent('CLAUDE.md', '@AGENTS.md');
        runResult.assertNoFileContent('CLAUDE.md', 'Guidance this team wrote by hand');
    }).timeout(10000);

    // Claude Code ignores AGENTS.md when a CLAUDE.md sits beside it unless that CLAUDE.md imports it.
    // A developer who keeps their own CLAUDE.md has to be told, and the closing message must not
    // claim an import that is not there.
    describe('the closing message about the CLAUDE.md import', () => {
        const warning =
            'Your CLAUDE.md does not import AGENTS.md, so Claude Code will not read the new instructions. Add this line to it: @AGENTS.md';

        it('warns, and claims no import, when the developer keeps a CLAUDE.md that has none', async () => {
            const context = helpers
                .run(generator)
                .doInDir(writeMidEraProject)
                .withOptions({ ...quiet, force: false })
                .withPrompts({ action: 'skip' });
            const log = captureLog(context);

            runResult = await context;

            const output = log.join('\n');

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'CLAUDE.md'), 'utf8'), MID_ERA_CLAUDE_MD);
            assert.ok(output.includes('does not import AGENTS.md'), output);
            assert.ok(output.includes(warning), output);
            assert.ok(output.includes("The project's own CLAUDE.md was kept"), output);
            assert.ok(!output.includes('that imports it'), output);
        }).timeout(10000);

        it('keeps saying CLAUDE.md imports AGENTS.md, with no warning, when the import replaced theirs', async () => {
            const context = helpers
                .run(generator)
                .doInDir(writeMidEraProject)
                .withOptions({ ...quiet, force: true });
            const log = captureLog(context);

            runResult = await context;

            const output = log.join('\n');

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'CLAUDE.md'), 'utf8').trim(), '@AGENTS.md');
            assert.ok(output.includes('a CLAUDE.md that imports it'), output);
            assert.ok(!output.includes('does not import AGENTS.md'), output);
        }).timeout(10000);

        it('does not warn when the CLAUDE.md the developer kept has the import among its own lines', async () => {
            const mine = [
                '# tabs-unlimited',
                '',
                'Guidance this team wrote by hand.',
                '',
                '@AGENTS.md',
                '',
                'Our own rules, below the import.',
                '',
            ].join('\n');
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    writeMidEraProject(dir);
                    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), mine);
                })
                .withOptions({ ...quiet, force: false })
                .withPrompts({ action: 'skip' });
            const log = captureLog(context);

            runResult = await context;

            const output = log.join('\n');

            // Skip kept their file, so the closing message reads the developer's CLAUDE.md, not the generated one.
            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'CLAUDE.md'), 'utf8'), mine);
            assert.ok(!output.includes('does not import AGENTS.md'), output);
        }).timeout(10000);
    });

    // What counts as an import is the way Claude Code writes one: `@AGENTS.md` or `@./AGENTS.md` as a
    // token of its own, at the start of a line or after whitespace and followed by whitespace or the
    // end of the file.
    describe('importsAgentsFile', () => {
        it('accepts @AGENTS.md and @./AGENTS.md wherever they stand as a token of their own', () => {
            for (const claudeMd of [
                '@AGENTS.md\n',
                '@AGENTS.md',
                '@./AGENTS.md\n',
                '# Rules\n\n@AGENTS.md\n\nMore rules.\n',
                'Read @AGENTS.md first.\n',
                '# Rules\r\n@AGENTS.md\r\n',
                '\t@./AGENTS.md',
            ]) {
                assert.ok(importsAgentsFile(claudeMd), JSON.stringify(claudeMd));
            }
        });

        it('does not take a mention or a look-alike for an import', () => {
            for (const claudeMd of [
                '',
                '# Rules\n\nNo import here.\n',
                'See AGENTS.md for the rules.\n',
                'Mail me@AGENTS.md\n',
                '@AGENTS.mdx\n',
                '@AGENTS.md.bak\n',
                '@docs/AGENTS.md\n',
                '`@AGENTS.md`\n',
            ]) {
                assert.ok(!importsAgentsFile(claudeMd), JSON.stringify(claudeMd));
            }
        });
    });

    it('writes nothing new on a second run', async () => {
        runResult = await helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);

        const projectDir = runResult.cwd;
        const before = snapshot(projectDir);

        // Second run in the same directory. force is off and every conflict answer is
        // 'abort' so any attempt to rewrite a differing file fails the test loudly.
        const second = await helpers
            .run(generator)
            .cd(projectDir)
            .withOptions({ ...quiet, force: false })
            .withPrompts({ action: 'abort' });

        assert.deepStrictEqual(snapshot(projectDir), before);
        second.restore();
    }).timeout(20000);

    it('refuses to run outside a plugin project and writes nothing', async () => {
        let projectDir = '';

        await assert.rejects(
            helpers
                .run(generator)
                .doInDir((dir) => {
                    projectDir = dir;
                    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'not-evoke' }));
                })
                .withOptions(quiet),
            { name: 'NotAPluginProjectError', message: /does not depend on/ },
        );

        assert.deepStrictEqual(fs.readdirSync(projectDir).sort(), ['package.json']);
    }).timeout(10000);

    it('refuses to run in an empty directory', async () => {
        let projectDir = '';

        await assert.rejects(
            helpers
                .run(generator)
                .doInDir((dir) => {
                    projectDir = dir;
                })
                .withOptions(quiet),
            { name: 'NotAPluginProjectError', message: /No package\.json/ },
        );

        assert.deepStrictEqual(fs.readdirSync(projectDir), []);
    }).timeout(10000);

    it('rejects an unknown --skills value before touching the project', async () => {
        let projectDir = '';

        await assert.rejects(
            helpers
                .run(generator)
                .doInDir((dir) => {
                    projectDir = dir;
                    writeYearOldProject(dir);
                })
                .withOptions({ ...quiet, skills: 'cursor' }),
            { name: 'UsageError', message: /--skills must be 'claude' or 'agents', got 'cursor'/ },
        );

        assert.ok(!fs.existsSync(path.join(projectDir, 'AGENTS.md')));
    }).timeout(10000);

    it('rejects a malformed --env-url', async () => {
        await assert.rejects(
            helpers
                .run(generator)
                .doInDir(writeYearOldProject)
                .withOptions({ ...quiet, 'env-url': 'acme.example.com' }),
            { name: 'UsageError', message: /--env-url: URL must start with https:\/\/ or http:\/\// },
        );
    }).timeout(10000);

    it('accepts a current scaffold and adds the agent files', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeCurrentProject)
            .withOptions({ skills: 'claude', 'env-url': '' });

        runResult.assertFile(agentItems('claude'));
        runResult.assertFileContent('AGENTS.md', '# current-widgets');
    }).timeout(10000);

    it('adds the missing test tooling when asked, changing nothing that already existed', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir((dir) => {
                writeYearOldProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const existing = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                // A tooling dependency the project already has, at a version unlike the template's.
                existing.devDependencies['@storybook/addon-interactions'] = '7.0.0-custom';
                fs.writeFileSync(pkgPath, JSON.stringify(existing, null, 4) + '\n');
            })
            .withOptions({ ...quiet, 'add-test-tooling': true });

        const raw = fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8');
        const pkg = JSON.parse(raw);

        for (const name of [
            '@storybook/jest',
            '@storybook/test-runner',
            'msw',
            'msw-storybook-addon',
            'playwright',
            'react-router-dom',
        ]) {
            assert.ok(pkg.devDependencies[name], `${name} missing`);
        }

        assert.strictEqual(pkg.devDependencies['react-router-dom'], '^6.16.0');
        assert.strictEqual(pkg.devDependencies['@storybook/react'], '7.6.17', 'pinned version was changed');
        assert.strictEqual(
            pkg.devDependencies['@storybook/addon-interactions'],
            '7.0.0-custom',
            'existing version was changed',
        );
        assert.strictEqual(pkg.scripts.build, 'webpack --mode production');
        assert.strictEqual(pkg.scripts['test-storybook'], 'test-storybook --url http://127.0.0.1:6006');
        assert.strictEqual(pkg.scripts.postinstall, 'playwright install chromium && msw init');
        assert.deepStrictEqual(pkg.msw, { workerDirectory: ['.storybook/public'] });

        // Four-space indentation survives, so the diff is the added keys and nothing else.
        assert.ok(raw.startsWith('{\n    "name"'), raw.slice(0, 40));

        runResult.assertFile(['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts']);
        runResult.assertFileContent('test-runner-jest.config.js', 'rootDir: __dirname');
        runResult.assertFileContent('.gitignore', '.storybook/public/');

        // Printed, never written.
        runResult.assertFileContent('.storybook/main.ts', YEAR_OLD_MAIN_TS);
        runResult.assertFileContent('.storybook/preview.ts', YEAR_OLD_PREVIEW_TS);
        runResult.assertNoFile(['.storybook/preview.tsx']);
    }).timeout(10000);

    it('leaves an existing postinstall script alone when adding tooling', async () => {
        const context = helpers
            .run(generator)
            .doInDir((dir) => {
                writeYearOldProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                pkg.scripts.postinstall = 'node ./scripts/setup.js';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
            })
            .withOptions({ ...quiet, 'add-test-tooling': true });
        const log = captureLog(context);

        runResult = await context;

        const pkg = JSON.parse(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'));

        assert.strictEqual(pkg.scripts.postinstall, 'node ./scripts/setup.js');
        assert.ok(pkg.devDependencies.msw);

        const output = log.join('\n');

        assert.ok(output.includes('Your existing postinstall script was left alone'), output);
        assert.ok(output.includes('&& playwright install chromium && msw init'), output);
        assert.ok(output.includes('npx playwright install chromium && npx msw init .storybook/public'), output);
    }).timeout(10000);

    it('closes with the two manual Storybook edits when the tooling was added', async () => {
        const context = helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ ...quiet, 'add-test-tooling': true });
        const log = captureLog(context);

        runResult = await context;

        const output = log.join('\n');

        assert.ok(output.includes('Storybook test tooling added'), output);
        assert.ok(output.includes("staticDirs: ['./public']"), output);
        assert.ok(output.includes('mswLoader'), output);
        assert.ok(output.includes('MemoryRouter'), output);
        assert.ok(output.includes('resetRequestLog'), output);
        assert.ok(output.includes('rename it to preview.tsx'), output);

        // An existing loaders or decorators entry must be merged into, not replaced by a second key.
        for (const key of ['loaders', 'decorators']) {
            const line = output.split('\n').find((l) => l.includes(`${key}: [`));

            assert.ok(line?.includes(`existing ${key}`), `${key} line does not say to merge: ${line}`);
        }

        assert.ok(output.includes('mswLoader before the reset loader'), output);
        assert.ok(!output.includes('export a resetRequestLog()'), output);
        assert.ok(!output.includes('runs Storybook on port'), output);
    }).timeout(10000);

    it('tells the developer to export resetRequestLog when the project kept its own handlers file', async () => {
        const mine = "import { http } from 'msw';\nexport const handlers = [http.get('/mine', () => null)];\n";
        const context = helpers
            .run(generator)
            .doInDir((dir) => {
                writeYearOldProject(dir);
                fs.mkdirSync(path.join(dir, 'src/mocks'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'src/mocks/evokeHandlers.ts'), mine);
            })
            .withOptions({ ...quiet, 'add-test-tooling': true });
        const log = captureLog(context);

        runResult = await context;

        const output = log.join('\n');
        const lines = output.split('\n');
        const importAt = lines.findIndex((l) =>
            l.includes("import { resetRequestLog } from '../src/mocks/evokeHandlers'"),
        );

        assert.ok(importAt >= 0, output);
        assert.ok(lines[importAt + 1].includes('export a resetRequestLog() from it'), output);
        assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'src/mocks/evokeHandlers.ts'), 'utf8'), mine);
    }).timeout(10000);

    it('uses the project Storybook port for test-storybook and says so', async () => {
        const context = helpers
            .run(generator)
            .doInDir((dir) => {
                writeYearOldProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                pkg.scripts.storybook = 'storybook dev -p 3000';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
            })
            .withOptions({ ...quiet, 'add-test-tooling': true });
        const log = captureLog(context);

        runResult = await context;

        const pkg = JSON.parse(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'));

        assert.strictEqual(pkg.scripts['test-storybook'], 'test-storybook --url http://127.0.0.1:3000');
        assert.strictEqual(pkg.scripts.storybook, 'storybook dev -p 3000');
        assert.ok(log.join('\n').includes('This project runs Storybook on port 3000'), log.join('\n'));
        // The instructions read the port from package.json, so the note must not tell the
        // developer that they assume 6006.
        assert.ok(!log.join('\n').includes('assume port'), log.join('\n'));
    }).timeout(10000);

    it('does not say test-storybook was set when the project already had its own test-storybook script', async () => {
        const context = helpers
            .run(generator)
            .doInDir((dir) => {
                writeYearOldProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                pkg.scripts.storybook = 'storybook dev -p 3000';
                pkg.scripts['test-storybook'] = 'test-storybook --url http://localhost:3000 --maxWorkers=2';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
            })
            .withOptions({ ...quiet, 'add-test-tooling': true });
        const log = captureLog(context);

        runResult = await context;

        const pkg = JSON.parse(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'));

        assert.strictEqual(pkg.scripts['test-storybook'], 'test-storybook --url http://localhost:3000 --maxWorkers=2');
        assert.ok(!log.join('\n').includes('so test-storybook was set'), log.join('\n'));
    }).timeout(10000);

    it('closes by naming what is missing and how to add it when the tooling was not added', async () => {
        const context = helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);
        const log = captureLog(context);

        runResult = await context;

        const lines = log.join('\n').split('\n');

        assert.ok(lines.includes('Storybook test tooling was not added. Missing:'), lines.join('\n'));
        assert.ok(lines.includes('  [ ] script test-storybook'), lines.join('\n'));
        assert.ok(
            lines.some((line) => line.includes('Re-run with --add-test-tooling')),
            lines.join('\n'),
        );
    }).timeout(10000);

    it('does not add react-router-dom when the project already depends on it', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir((dir) => {
                writeYearOldProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                pkg.dependencies['react-router-dom'] = '^6.0.0';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
            })
            .withOptions({ ...quiet, 'add-test-tooling': true });

        const pkg = JSON.parse(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'));

        assert.strictEqual(pkg.devDependencies['react-router-dom'], undefined);
        assert.strictEqual(pkg.dependencies['react-router-dom'], '^6.0.0');
        assert.ok(pkg.devDependencies.msw);
    }).timeout(10000);

    describe('on Storybook 8 or newer', () => {
        const writeStorybook9Project = (dir: string) => {
            writeYearOldProject(dir);

            const pkgPath = path.join(dir, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

            delete pkg.devDependencies['@storybook/react'];
            delete pkg.devDependencies['@storybook/addon-interactions'];
            pkg.devDependencies.storybook = '^9.0.13';
            pkg.devDependencies['@storybook/react-webpack5'] = '^9.0.13';
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
        };

        const tooling = ['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts'];

        it('adds the agent files but not the tooling, even when --add-test-tooling is passed', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    writeStorybook9Project(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ ...quiet, 'add-test-tooling': true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(tooling);
            runResult.assertFile(['AGENTS.md', '.claude/skills/build-widget/SKILL.md']);

            const output = log.join('\n');

            assert.ok(output.includes('This project uses Storybook 9'), output);
            assert.ok(output.includes('The agent files were added.'), output);
            assert.ok(output.includes('--add-test-tooling was ignored'), output);
            assert.ok(!output.includes('Re-run with --add-test-tooling'), output);
        }).timeout(10000);

        it('does not say --add-test-tooling was ignored when it was --no-add-test-tooling', async () => {
            const context = helpers.run(generator).doInDir(writeStorybook9Project).withOptions(quiet);
            const log = captureLog(context);

            runResult = await context;

            const output = log.join('\n');

            assert.ok(output.includes('This project uses Storybook 9'), output);
            assert.ok(!output.includes('--add-test-tooling was ignored'), output);
        }).timeout(10000);

        it('only notes that complete existing tooling was left as it is', async () => {
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    writeCurrentProject(dir);

                    const pkgPath = path.join(dir, 'package.json');
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                    pkg.devDependencies.storybook = '^9.0.13';
                    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
                })
                .withOptions(quiet);
            const log = captureLog(context);

            runResult = await context;

            const output = log.join('\n');

            assert.ok(output.includes('The agent files were added.'), output);
            assert.ok(output.includes('existing test tooling was left as it is'), output);
            assert.ok(!output.includes('the tooling was not added'), output);
            assert.ok(!output.includes('need setting up'), output);
        }).timeout(10000);

        it('never asks the tooling question', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    writeStorybook9Project(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ skills: 'claude', 'env-url': '' })
                .withPrompts({ addTestTooling: true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(tooling);

            const output = log.join('\n');

            assert.ok(output.includes('This project uses Storybook 9'), output);
            assert.ok(!output.includes('--add-test-tooling was ignored'), output);
            assert.ok(!output.includes('Re-run with --add-test-tooling'), output);
        }).timeout(10000);
    });

    describe("when the project's versions cannot take the tooling", () => {
        const tooling = ['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts'];
        const edit = (change: (pkg: Record<string, Record<string, string>>) => void) => (dir: string) => {
            writeYearOldProject(dir);

            const pkgPath = path.join(dir, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

            change(pkg);
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
        };

        it('skips the tooling when Storybook is declared as latest', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    edit((pkg) => {
                        pkg.devDependencies.storybook = 'latest';
                        delete pkg.devDependencies['@storybook/react'];
                    })(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ ...quiet, 'add-test-tooling': true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(tooling);
            runResult.assertFile(['AGENTS.md']);

            const output = log.join('\n');

            assert.ok(
                output.includes(
                    'This project declares Storybook as "latest", so its version cannot be checked. The Plugin Agent\'s test tooling targets Storybook 7, so it was not added.',
                ),
                output,
            );
            assert.ok(output.includes('cannot be checked'), output);
            assert.ok(!output.includes('Re-run with --add-test-tooling'), output);
            assert.ok(output.includes('The agent files were added.'), output);
            assert.ok(output.includes('--add-test-tooling was ignored'), output);
        }).timeout(10000);

        it('never asks the tooling question when the Storybook version is unreadable', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    edit((pkg) => {
                        pkg.devDependencies.storybook = '*';
                    })(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ skills: 'claude', 'env-url': '' })
                .withPrompts({ addTestTooling: true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(tooling);
            assert.ok(log.join('\n').includes('cannot be checked'));
            assert.ok(!log.join('\n').includes('--add-test-tooling was ignored'));
            assert.ok(!log.join('\n').includes('Re-run with --add-test-tooling'));
        }).timeout(10000);

        it('skips the tooling when MSW 1 is installed', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    edit((pkg) => {
                        pkg.devDependencies.msw = '^1.3.0';
                    })(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ ...quiet, 'add-test-tooling': true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(tooling);
            runResult.assertFile(['AGENTS.md']);

            const output = log.join('\n');

            assert.ok(
                output.includes(
                    "This project uses MSW 1. The Plugin Agent's mock handlers and Storybook addon need MSW 2, so the test tooling was not added.",
                ),
                output,
            );
            assert.ok(output.includes('The agent files were added.'), output);
            assert.ok(output.includes('--add-test-tooling was ignored'), output);
            assert.ok(!output.includes('Re-run with --add-test-tooling'), output);
        }).timeout(10000);

        it('skips the tooling and names the spec when MSW is declared but unreadable', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    edit((pkg) => {
                        pkg.devDependencies.msw = 'latest';
                    })(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ ...quiet, 'add-test-tooling': true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(tooling);
            assert.ok(log.join('\n').includes('declares MSW as "latest"'), log.join('\n'));
            assert.ok(!log.join('\n').includes('Re-run with --add-test-tooling'));
        }).timeout(10000);

        it('reports the Storybook version when Storybook is latest and MSW is 1', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    edit((pkg) => {
                        pkg.devDependencies.storybook = 'latest';
                        pkg.devDependencies.msw = '^1.3.0';
                    })(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ ...quiet, 'add-test-tooling': true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(tooling);

            const output = log.join('\n');

            assert.ok(output.includes('cannot be checked'), output);
            assert.ok(!output.includes('Re-run with --add-test-tooling'), output);
        }).timeout(10000);

        it('still adds the tooling for MSW 2', async () => {
            runResult = await helpers
                .run(generator)
                .doInDir(
                    edit((pkg) => {
                        pkg.devDependencies.msw = '^2.4.0';
                    }),
                )
                .withOptions({ ...quiet, 'add-test-tooling': true });

            runResult.assertFile(tooling);
        }).timeout(10000);
    });

    it('skips the tooling when told no, and does not touch package.json', async () => {
        runResult = await helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);

        runResult.assertNoFileContent('package.json', 'msw');
        runResult.assertNoFile(['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts']);
    }).timeout(10000);

    it('asks the tooling question only when something is missing', async () => {
        // The mocked answer to the tooling prompt is Yes. If the prompt were asked on a
        // complete project, the two tooling files would be overwritten with the templates
        // (yeoman-test forces overwrites). They must come through byte-identical.
        let packageJsonBefore = '';

        const context = helpers
            .run(generator)
            .doInDir((dir) => {
                writeCurrentProject(dir);
                packageJsonBefore = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
            })
            .withOptions({ skills: 'claude', 'env-url': '' })
            .withPrompts({ addTestTooling: true });
        const log = captureLog(context);

        runResult = await context;

        // The file checks below pass even when the prompt is wrongly shown (the generator never
        // overwrites tooling files), so the printed text that comes right before the prompt is
        // what proves the question was not asked.
        assert.doesNotMatch(log.join('\n'), /This project is missing some of that tooling/);
        runResult.assertFile('AGENTS.md');
        assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), packageJsonBefore);
        runResult.assertFileContent('test-runner-jest.config.js', 'module.exports = {};');
        runResult.assertNoFileContent('test-runner-jest.config.js', 'getJestConfig');
        runResult.assertFileContent('src/mocks/evokeHandlers.ts', 'export const handlers = [];');
    }).timeout(10000);

    it('never overwrites a tooling file the project already has, even when forced', async () => {
        const customHandlers =
            "import { http } from 'msw';\nexport const handlers = [http.get('/mine', () => null)];\n";
        const customRunnerConfig = 'module.exports = { mine: true };\n';
        let packageJsonBefore = '';

        runResult = await helpers
            .run(generator)
            .doInDir((dir) => {
                writeCurrentProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                // Incomplete report (postinstall lacks msw init), so the tooling path runs.
                pkg.scripts.postinstall = 'node ./scripts/setup.js';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
                packageJsonBefore = fs.readFileSync(pkgPath, 'utf8');
                fs.writeFileSync(path.join(dir, 'src/mocks/evokeHandlers.ts'), customHandlers);
                fs.writeFileSync(path.join(dir, 'test-runner-jest.config.js'), customRunnerConfig);
            })
            .withOptions({ skills: 'claude', 'env-url': '', 'add-test-tooling': true, force: true });

        const onDisk = (file: string) => fs.readFileSync(path.join(runResult!.cwd, file), 'utf8');

        assert.strictEqual(onDisk('src/mocks/evokeHandlers.ts'), customHandlers);
        assert.strictEqual(onDisk('test-runner-jest.config.js'), customRunnerConfig);
        assert.strictEqual(onDisk('package.json'), packageJsonBefore);
    }).timeout(10000);

    it('answers the tooling prompt from the terminal when no option is given', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ skills: 'claude', 'env-url': '' })
            .withPrompts({ addTestTooling: true });

        runResult.assertFile(['test-runner-jest.config.js']);
        runResult.assertFileContent('package.json', '"test-storybook"');
    }).timeout(10000);

    it('writes no tooling when the tooling prompt is answered No', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ skills: 'claude', 'env-url': '' })
            .withPrompts({ addTestTooling: false });

        runResult.assertFile('AGENTS.md');
        runResult.assertNoFile(['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts']);
        runResult.assertNoFileContent('package.json', 'test-storybook');
    }).timeout(10000);

    it('neither asks nor says "added" when the only gap is a postinstall the command never edits', async () => {
        let packageJsonBefore = '';

        const context = helpers
            .run(generator)
            .doInDir((dir) => {
                writeCurrentProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                pkg.scripts.postinstall = 'node ./scripts/setup.js';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
                packageJsonBefore = fs.readFileSync(pkgPath, 'utf8');
            })
            .withOptions({ skills: 'claude', 'env-url': '' })
            .withPrompts({ addTestTooling: true });
        const log = captureLog(context);

        runResult = await context;

        const output = log.join('\n');

        assert.ok(output.includes('Your existing postinstall script was left alone'), output);
        assert.ok(output.includes('npx playwright install chromium && npx msw init .storybook/public'), output);
        assert.doesNotMatch(output, /Storybook test tooling added/);
        assert.doesNotMatch(output, /This project is missing some of that tooling/);
        assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), packageJsonBefore);
    }).timeout(10000);

    it('says the same for --add-test-tooling when there is nothing to add', async () => {
        const context = helpers
            .run(generator)
            .doInDir((dir) => {
                writeCurrentProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

                pkg.scripts.postinstall = 'node ./scripts/setup.js';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
            })
            .withOptions({ skills: 'claude', 'env-url': '', 'add-test-tooling': true });
        const log = captureLog(context);

        runResult = await context;

        const output = log.join('\n');

        assert.ok(output.includes('Your existing postinstall script was left alone'), output);
        assert.doesNotMatch(output, /Storybook test tooling added/);
    }).timeout(10000);

    describe('when the project has no Storybook', () => {
        const writeNoStorybookProject = (dir: string) => {
            writeYearOldProject(dir);

            const pkgPath = path.join(dir, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

            for (const name of Object.keys(pkg.devDependencies)) {
                if (name === 'storybook' || name.startsWith('@storybook/')) {
                    delete pkg.devDependencies[name];
                }
            }

            delete pkg.scripts.storybook;
            delete pkg.scripts['build-storybook'];
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 4) + '\n');
        };

        it('skips the tooling even when --add-test-tooling is passed, and says why', async () => {
            let before = '';
            const context = helpers
                .run(generator)
                .doInDir((dir) => {
                    writeNoStorybookProject(dir);
                    before = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
                })
                .withOptions({ ...quiet, 'add-test-tooling': true });
            const log = captureLog(context);

            runResult = await context;

            assert.strictEqual(fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8'), before);
            runResult.assertNoFile(['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts']);
            runResult.assertFile('AGENTS.md');

            const output = log.join('\n');

            assert.ok(
                output.includes('This project has no Storybook, so the Storybook test tooling was not added.'),
                output,
            );
            assert.ok(output.includes('The agent files were added.'), output);
            assert.ok(output.includes('--add-test-tooling was ignored'), output);
        }).timeout(10000);

        it('never asks the tooling question', async () => {
            const context = helpers
                .run(generator)
                .doInDir(writeNoStorybookProject)
                .withOptions({ skills: 'claude', 'env-url': '' })
                .withPrompts({ addTestTooling: true });
            const log = captureLog(context);

            runResult = await context;

            assert.doesNotMatch(log.join('\n'), /This project is missing some of that tooling/);
            runResult.assertNoFile(['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts']);
        }).timeout(10000);
    });

    it('keeps the CRLF line endings and missing final newline of package.json when adding tooling', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir((dir) => {
                writeYearOldProject(dir);
                const pkgPath = path.join(dir, 'package.json');
                const original = fs.readFileSync(pkgPath, 'utf8');

                fs.writeFileSync(pkgPath, original.replace(/\n$/, '').replace(/\n/g, '\r\n'));
            })
            .withOptions({ ...quiet, 'add-test-tooling': true });

        const raw = fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8');

        assert.ok(!/(^|[^\r])\n/.test(raw), 'every line feed must be preceded by a carriage return');
        assert.ok(raw.includes('\r\n'));
        assert.ok(!raw.endsWith('\n'), 'must not gain a final newline');
        assert.strictEqual(JSON.parse(raw).scripts['test-storybook'], 'test-storybook --url http://127.0.0.1:6006');
    }).timeout(10000);

    it('keeps LF and the final newline of package.json when adding tooling', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({
                ...quiet,
                'add-test-tooling': true,
            });

        const raw = fs.readFileSync(path.join(runResult.cwd, 'package.json'), 'utf8');

        assert.ok(!raw.includes('\r'));
        assert.ok(raw.endsWith('}\n'));
    }).timeout(10000);
});

// Relative path -> content and mtime for every file under dir, skipping node_modules.
function snapshot(dir: string): Record<string, { content: string; mtimeMs: number }> {
    const out: Record<string, { content: string; mtimeMs: number }> = {};
    const walk = (current: string) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (entry.name === 'node_modules') continue;

            const full = path.join(current, entry.name);

            if (entry.isDirectory()) {
                walk(full);
            } else {
                out[path.relative(dir, full)] = {
                    content: fs.readFileSync(full, 'utf8'),
                    mtimeMs: fs.statSync(full).mtimeMs,
                };
            }
        }
    };

    walk(dir);

    return out;
}

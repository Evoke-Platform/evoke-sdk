// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import type { PackageJson } from './detect';

// The feedback loop the instructions assume: Storybook interaction tests run headless by
// `npm run test-storybook`, with MSW standing in for the Evoke API. A project without
// these leaves an agent changing UI code blind.
export const TEST_TOOLING_DEV_DEPENDENCIES = [
    '@storybook/addon-interactions',
    '@storybook/jest',
    '@storybook/test-runner',
    'msw',
    'msw-storybook-addon',
    'playwright',
    'react-router-dom',
];

export const TEST_TOOLING_FILES = ['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts'];
export const POSTINSTALL_MARKER = 'msw init';
export const MSW_WORKER_DIRECTORY = '.storybook/public';

export const DEFAULT_STORYBOOK_PORT = '6006';

// Older projects run Storybook on another port (for example 3000), and
// test-storybook must point at the same one or it exits at once saying Storybook is not running.
export function storybookPortOf(pkg: PackageJson): string {
    const match = /(?:^|\s)(?:-p|--port)(?:=|\s+)(\d+)(?!\S)/.exec(pkg.scripts?.storybook ?? '');

    return match?.[1] ?? DEFAULT_STORYBOOK_PORT;
}

// Storybook major the scaffold, its tooling and the agent instructions target.
export const SCAFFOLD_STORYBOOK_MAJOR = 7;

// What a project declares for a package: nothing, a spec with no number in it (latest, *,
// next, workspace:*) that cannot be checked, or a major version.
export type DeclaredVersion = { kind: 'absent' } | { kind: 'unknown'; spec: string } | { kind: 'major'; major: number };

function declaredVersionOf(pkg: PackageJson, names: string[]): DeclaredVersion {
    const declared: Record<string, unknown> = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const name of names) {
        const spec = declared[name];

        if (typeof spec === 'string') {
            const digits = /\d+/.exec(spec)?.[0];

            return digits === undefined ? { kind: 'unknown', spec } : { kind: 'major', major: Number(digits) };
        }
    }

    return { kind: 'absent' };
}

// storybook first, then @storybook/react, then the framework packages: a project may
// declare only one of them. The first one declared decides, so an unreadable spec on an
// earlier package is never hidden by a numeric one on a later package.
export function storybookVersionOf(pkg: PackageJson): DeclaredVersion {
    return declaredVersionOf(pkg, [
        'storybook',
        '@storybook/react',
        '@storybook/react-webpack5',
        '@storybook/react-vite',
    ]);
}

// The major version the project declares for Storybook, or undefined when it declares none
// or a spec with no number in it. Callers that must tell those apart use storybookVersionOf.
export function storybookMajorOf(pkg: PackageJson): number | undefined {
    const version = storybookVersionOf(pkg);

    return version.kind === 'major' ? version.major : undefined;
}

export function mswVersionOf(pkg: PackageJson): DeclaredVersion {
    return declaredVersionOf(pkg, ['msw']);
}

// The bundled handlers file imports http and HttpResponse from 'msw', which only MSW 2 has.
export const SCAFFOLD_MSW_MAJOR = 2;

export function mswMajorOf(pkg: PackageJson): number | undefined {
    const version = mswVersionOf(pkg);

    return version.kind === 'major' ? version.major : undefined;
}

export type TestToolingItem = { label: string; present: boolean };
export type TestToolingReport = { items: TestToolingItem[]; complete: boolean };

// msw 1.x wrote workerDirectory as a plain string. Treat it as a one-item list so that
// includes() matches whole entries and spreading never splits it into characters.
function workerDirectoriesOf(pkg: PackageJson): string[] {
    const dir = pkg.msw?.workerDirectory;

    return Array.isArray(dir) ? dir : typeof dir === 'string' && dir ? [dir] : [];
}

export function inspectTestTooling(pkg: PackageJson, fileExists: (relativePath: string) => boolean): TestToolingReport {
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    const scripts = pkg.scripts ?? {};
    const workerDirectories = workerDirectoriesOf(pkg);

    const items: TestToolingItem[] = [
        ...TEST_TOOLING_DEV_DEPENDENCIES.map((name) => ({
            label: `devDependency ${name}`,
            present: name in declared,
        })),
        { label: 'script test-storybook', present: 'test-storybook' in scripts },
        {
            label: `script postinstall running '${POSTINSTALL_MARKER}'`,
            present: (scripts.postinstall ?? '').includes(POSTINSTALL_MARKER),
        },
        {
            label: `package.json msw.workerDirectory includes ${MSW_WORKER_DIRECTORY}`,
            present: workerDirectories.includes(MSW_WORKER_DIRECTORY),
        },
        ...TEST_TOOLING_FILES.map((file) => ({ label: `file ${file}`, present: fileExists(file) })),
    ];

    return { items, complete: items.every((item) => item.present) };
}

// Only keys the project lacks. Existing versions, scripts and settings are never changed,
// so a project that pinned something on purpose keeps its pin. The result is shaped for
// mem-fs-editor's extendJSON, which deep-merges objects and replaces arrays.
export function planPackageJsonAdditions(pkg: PackageJson, templatePkg: PackageJson): Partial<PackageJson> {
    const additions: Partial<PackageJson> = {};
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    const existingScripts = pkg.scripts ?? {};
    const devDependencies: Record<string, string> = {};
    const scripts: Record<string, string> = {};

    for (const name of TEST_TOOLING_DEV_DEPENDENCIES) {
        const version = templatePkg.devDependencies?.[name];

        if (version && !(name in declared)) {
            devDependencies[name] = version;
        }
    }

    for (const name of ['test-storybook', 'postinstall']) {
        const command = templatePkg.scripts?.[name];

        if (command && !(name in existingScripts)) {
            scripts[name] =
                name === 'test-storybook'
                    ? command.replace(`127.0.0.1:${DEFAULT_STORYBOOK_PORT}`, `127.0.0.1:${storybookPortOf(pkg)}`)
                    : command;
        }
    }

    if (Object.keys(devDependencies).length > 0) {
        additions.devDependencies = devDependencies;
    }

    if (Object.keys(scripts).length > 0) {
        additions.scripts = scripts;
    }

    const workerDirectories = workerDirectoriesOf(pkg);

    if (!workerDirectories.includes(MSW_WORKER_DIRECTORY)) {
        additions.msw = { workerDirectory: [...workerDirectories, MSW_WORKER_DIRECTORY] };
    }

    return additions;
}

export function formatTestToolingReport(report: TestToolingReport): string[] {
    return report.items.map((item) => `  [${item.present ? 'x' : ' '}] ${item.label}`);
}

// Every real project has edited these two files, so they are printed, not written. Following
// them ends with the preview a new scaffold has: MSW, the router SDK components need, and
// the request-log reset the installed src/mocks/evokeHandlers.ts relies on. The loaders and
// decorators lines say to merge, because a second key would silently replace the project's own.
// keptOwnHandlers: the project already had src/mocks/evokeHandlers.ts, which is never replaced,
// so its version may not export resetRequestLog.
export function storybookManualEdits(keptOwnHandlers: boolean): string {
    return [
        '  .storybook/main.ts',
        "    - add 'msw-storybook-addon' to addons ('@storybook/addon-interactions' too, if missing)",
        "    - add:  staticDirs: ['./public'],",
        '  .storybook/preview.ts  ->  rename it to preview.tsx (the router decorator below is JSX)',
        "    - add:  import { initialize, mswLoader } from 'msw-storybook-addon';",
        "    - add:  import { MemoryRouter } from 'react-router-dom';",
        "    - add:  import { resetRequestLog } from '../src/mocks/evokeHandlers';",
        ...(keptOwnHandlers
            ? [
                  '      (if you kept your own src/mocks/evokeHandlers.ts, export a resetRequestLog() from it, ' +
                      "as the scaffold's version does)",
              ]
            : []),
        "    - add:  initialize({ onUnhandledRequest: 'error', serviceWorker: { url: './mockServiceWorker.js' } });",
        '    - add this entry to your existing loaders (create them if there are none), ' +
            'with mswLoader before the reset loader:  ' +
            'loaders: [mswLoader, () => { resetRequestLog(); return {}; }],',
        '    - add this entry to your existing decorators (create them if there are none):  ' +
            'decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],',
        '  Then start Storybook and run: npm run test-storybook',
    ].join('\n');
}

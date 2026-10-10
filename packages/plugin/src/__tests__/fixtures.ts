// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import fs from 'fs';
import path from 'path';

function write(dir: string, relativePath: string, content: string) {
    const target = path.join(dir, relativePath);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
}

// package.json as the generator wrote it in 2025: Storybook 7 with the interactions
// addon, but no test-runner, no @storybook/jest, no MSW, no playwright, no test script.
// Four-space indentation, like the template. Serialized by hand so the exact bytes are known.
export function yearOldPackageJson(name: string): string {
    return (
        JSON.stringify(
            {
                name,
                version: '0.0.0',
                private: true,
                dependencies: { '@evoke-platform/sdk': '^1.0.0', react: '^18.1.0', 'react-dom': '^18.1.0' },
                devDependencies: {
                    '@evoke-platform/plugin-scripts': '^1.0.0',
                    '@storybook/addon-essentials': '^7.0.2',
                    '@storybook/addon-interactions': '^7.0.2',
                    '@storybook/react': '7.6.17',
                    '@storybook/react-webpack5': '^7.0.2',
                    '@storybook/testing-library': '^0.2.0',
                    storybook: '^7.0.2',
                    typescript: '^5.0.2',
                    webpack: '^5.70.0',
                },
                scripts: {
                    start: 'webpack-cli serve',
                    prebuild: 'manifestgen',
                    build: 'webpack --mode production',
                    package: 'pkgplugin',
                    storybook: 'storybook dev -p 6006',
                    'build-storybook': 'storybook build',
                },
            },
            null,
            4,
        ) + '\n'
    );
}

export const YEAR_OLD_MAIN_TS = [
    "import type { StorybookConfig } from '@storybook/react-webpack5';",
    'const config: StorybookConfig = {',
    "    stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],",
    "    addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@storybook/addon-interactions'],",
    "    framework: { name: '@storybook/react-webpack5', options: {} },",
    '};',
    'export default config;',
    '',
].join('\n');

export const YEAR_OLD_PREVIEW_TS =
    "import type { Preview } from '@storybook/react';\nconst preview: Preview = {};\nexport default preview;\n";

export function writeYearOldProject(dir: string, name = 'tabs-unlimited') {
    write(dir, 'package.json', yearOldPackageJson(name));
    write(dir, '.gitignore', 'node_modules/\ndist/\n');
    write(dir, '.storybook/main.ts', YEAR_OLD_MAIN_TS);
    write(dir, '.storybook/preview.ts', YEAR_OLD_PREVIEW_TS);
    write(dir, 'src/widgets/Tabs/index.tsx', 'export default function Tabs() {\n    return null;\n}\n');
    write(dir, 'src/widgets/Tabs/WidgetProperties.json', '{ "name": "Tabs" }\n');
}

export const MID_ERA_CLAUDE_MD = '# tabs-unlimited\n\nGuidance this team wrote by hand. Keep it.\n';
export const MID_ERA_SKILL = '---\nname: build-widget\ndescription: Team-edited copy.\n---\n\nLocal edits.\n';

// A project that got a full-text CLAUDE.md plus skills from an earlier generator, but no
// AGENTS.md. The new CLAUDE.md is a one-line import, so this is the real conflict case.
export function writeMidEraProject(dir: string) {
    writeYearOldProject(dir);
    write(dir, 'CLAUDE.md', MID_ERA_CLAUDE_MD);
    write(dir, '.claude/skills/build-widget/SKILL.md', MID_ERA_SKILL);
}

// Today's scaffold: every tooling item present.
export function writeCurrentProject(dir: string) {
    const pkg = JSON.parse(yearOldPackageJson('current-widgets'));

    Object.assign(pkg.devDependencies, {
        '@storybook/jest': '^0.2.3',
        '@storybook/test-runner': '^0.16.0',
        msw: '^2.10.4',
        'msw-storybook-addon': '^2.0.5',
        playwright: '^1.40.0',
    });
    Object.assign(pkg.scripts, {
        'test-storybook': 'test-storybook --url http://127.0.0.1:6006',
        postinstall: 'playwright install chromium && msw init',
    });
    pkg.msw = { workerDirectory: ['.storybook/public'] };

    write(dir, 'package.json', JSON.stringify(pkg, null, 4) + '\n');
    write(dir, '.gitignore', 'node_modules/\ndist/\n.storybook/public/\n');
    write(dir, 'test-runner-jest.config.js', 'module.exports = {};\n');
    write(dir, 'src/mocks/evokeHandlers.ts', 'export const handlers = [];\n');
}

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import helpers, { RunResult } from 'yeoman-test';

// Return the source of the storySort arrow function, from its opening parenthesis to the
// closing brace of its body, so a test can try to build it as plain JavaScript.
function extractStorySort(previewSource: string): string | undefined {
    const label = previewSource.indexOf('storySort:');

    if (label === -1) {
        return undefined;
    }

    const start = previewSource.indexOf('(', label);
    let depth = 0;

    for (let i = start; i < previewSource.length; i++) {
        const char = previewSource[i];

        if (char === '(' || char === '{') {
            depth++;
        } else if (char === ')' || char === '}') {
            depth--;

            if (depth === 0 && char === '}') {
                return previewSource.slice(start, i + 1);
            }
        }
    }

    return undefined;
}

describe('create-plugin', () => {
    const appGenerator = path.join(__dirname, '../generators/app');
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
    let runResult: RunResult;

    afterEach(() => {
        runResult?.restore();
    });

    it('uses prompt to name resulting package', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'none' });

        runResult.assertFile(['testdir/package.json']);
        runResult.assertJsonFileContent('testdir/package.json', {
            name: 'test',
        });
    }).timeout(5000);

    it('does not copy internal agent instruction templates', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        runResult.assertNoFile([
            'testdir/_agent-instructions/INSTRUCTIONS.md',
            ...skillNames.map((skill) => `testdir/_agent-instructions/skills/${skill}/SKILL.md`),
        ]);
    }).timeout(5000);

    it('scaffolds CLAUDE.md and skills for the claude choice', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        runResult.assertFile([
            'testdir/CLAUDE.md',
            ...skillNames.map((skill) => `testdir/.claude/skills/${skill}/SKILL.md`),
        ]);
        runResult.assertFileContent('testdir/CLAUDE.md', '# test');
        runResult.assertNoFile([
            'testdir/AGENTS.md',
            'testdir/INSTRUCTIONS.md',
            'testdir/.agents/skills/plan-widget/SKILL.md',
            'testdir/_agent-instructions/INSTRUCTIONS.md',
        ]);
    }).timeout(5000);

    it('scaffolds AGENTS.md and skills for the codex choice', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'codex' });

        runResult.assertFile([
            'testdir/AGENTS.md',
            ...skillNames.map((skill) => `testdir/.agents/skills/${skill}/SKILL.md`),
        ]);
        runResult.assertFileContent('testdir/AGENTS.md', '# test');
        runResult.assertNoFile([
            'testdir/CLAUDE.md',
            'testdir/INSTRUCTIONS.md',
            'testdir/.claude/skills/plan-widget/SKILL.md',
            'testdir/_agent-instructions/INSTRUCTIONS.md',
        ]);
    }).timeout(5000);

    it('never writes the template filename into a generated project', async () => {
        // The source template is named INSTRUCTIONS.md and is always renamed on the way
        // out, to CLAUDE.md or AGENTS.md. No tool reads a file called INSTRUCTIONS.md, so
        // a project that ends up with one by that name has a copy bug, not a feature.
        for (const choice of ['claude', 'codex', 'none']) {
            runResult = await helpers
                .run(appGenerator)
                .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: choice });

            runResult.assertNoFile(['testdir/INSTRUCTIONS.md', 'testdir/_agent-instructions/INSTRUCTIONS.md']);
            runResult.restore();
        }
    }).timeout(15000);

    it('scaffolds no agent instruction files for the none choice', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'none' });

        runResult.assertNoFile([
            'testdir/CLAUDE.md',
            'testdir/AGENTS.md',
            'testdir/INSTRUCTIONS.md',
            'testdir/.claude/skills/plan-widget/SKILL.md',
            'testdir/.agents/skills/plan-widget/SKILL.md',
            'testdir/_agent-instructions/INSTRUCTIONS.md',
        ]);
    }).timeout(5000);

    it('omits the agent-only script and plans directory for the none choice', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'none' });

        // The fetch script reads its base URL from an instruction file that 'none' never
        // creates, so shipping it would leave a script that only ever exits 1.
        runResult.assertNoFile(['testdir/scripts/fetch-openapi-specs.sh', 'testdir/plans/.gitkeep']);

        // These two are useful to every project regardless of agent choice, so they ship
        // with the 'none' scaffold too.
        runResult.assertFile(['testdir/.gitignore', 'testdir/test-runner-jest.config.js']);
    }).timeout(5000);

    it('pins the test-runner rootDir so test-storybook stays inside the project', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        // A generated project is not a git repo, so the test-runner's getProjectRoot()
        // walk escapes it and lands on the user's home directory — jest then scans
        // everything under $HOME and the run appears to hang.
        runResult.assertFile(['testdir/test-runner-jest.config.js']);
        runResult.assertFileContent('testdir/test-runner-jest.config.js', 'rootDir: __dirname');
    }).timeout(5000);

    it('keeps the storybook preview free of the two defects that break every story', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        // UIThemeProvider is only a default export of a subpath that is not in the
        // package's `exports` map, and defaultTheme does not exist at all. Importing
        // either by name yields undefined and every story crashes on render.
        runResult.assertNoFileContent('testdir/.storybook/preview.tsx', /import\s*{[^}]*UIThemeProvider/);
        runResult.assertNoFileContent('testdir/.storybook/preview.tsx', /import\s*{[^}]*defaultTheme/);

        // Storybook builds the story index by re-reading storySort as plain JavaScript, so
        // a TypeScript annotation anywhere inside it makes /index.json return 500 and the
        // test runner find no stories. Rebuild the function the same way rather than
        // matching one spelling: annotating only the second parameter, or the inner rank
        // helper, or adding a space before a colon all break Storybook but would slip past
        // a literal check. Verified to agree with @storybook/csf-tools on every such case.
        const preview = fs.readFileSync(path.join(runResult.cwd, 'testdir/.storybook/preview.tsx'), 'utf8');
        const storySort = extractStorySort(preview);

        assert.ok(storySort, 'no storySort function found in the generated preview');
        assert.doesNotThrow(
            () => new Function(`return ${storySort}`),
            `storySort must parse as plain JavaScript, but does not:\n${storySort}`,
        );

        // MSW's default worker URL is absolute ('/mockServiceWorker.js'), which 404s when
        // a published Storybook is served from a per-plugin subfolder rather than a domain
        // root — every mocked story then errors.
        runResult.assertFileContent(
            'testdir/.storybook/preview.tsx',
            "serviceWorker: { url: './mockServiceWorker.js' }",
        );
    }).timeout(5000);

    it('copies skill bodies verbatim', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        runResult.assertFileContent(
            'testdir/.claude/skills/build-criteria-filters/SKILL.md',
            '| `$in`        | `inq`      |',
        );
    }).timeout(5000);

    it('scaffolds the fetch-openapi-specs script and gitignore', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        runResult.assertFile([
            'testdir/scripts/fetch-openapi-specs.sh',
            'testdir/plans/.gitkeep',
            'testdir/.gitignore',
        ]);
        runResult.assertFileContent('testdir/scripts/fetch-openapi-specs.sh', 'mailMerge/v3/api-docs');
        runResult.assertFileContent('testdir/.gitignore', '.openapi/');
        runResult.assertFileContent('testdir/.gitignore', 'node_modules/');
        runResult.assertFileContent('testdir/.gitignore', 'storybook-static/');
    }).timeout(5000);

    it('scaffolds the msw mock layer', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        runResult.assertFile(['testdir/src/mocks/evokeHandlers.ts', 'testdir/.storybook/preview.tsx']);
        runResult.assertNoFile(['testdir/.storybook/preview.ts']);
        runResult.assertFileContent('testdir/.storybook/main.ts', "staticDirs: ['./public']");
        runResult.assertFileContent('testdir/package.json', 'msw init');
        runResult.assertFileContent('testdir/src/mocks/evokeHandlers.ts', '/checkAccess$/');
        runResult.assertFileContent('testdir/src/mocks/evokeHandlers.ts', 'objectStore.findInstances()');
        runResult.assertFileContent('testdir/src/mocks/evokeHandlers.ts', '/instances/:instanceId/actions');
    }).timeout(5000);

    it('interpolates environmentUrl into the instruction file', async () => {
        runResult = await helpers.run(appGenerator).withPrompts({
            projectName: 'test',
            dirName: 'testdir',
            agentInstructions: 'claude',
            environmentUrl: 'https://myenv.example.com',
        });

        runResult.assertFileContent('testdir/CLAUDE.md', 'Base URL: https://myenv.example.com');
    }).timeout(5000);

    it('leaves Base URL as _not set_ when environmentUrl is empty', async () => {
        runResult = await helpers.run(appGenerator).withPrompts({
            projectName: 'test',
            dirName: 'testdir',
            agentInstructions: 'claude',
            environmentUrl: '',
        });

        runResult.assertFileContent('testdir/CLAUDE.md', 'Base URL: _not set_');
    }).timeout(5000);

    it('routes generated instructions to live OpenAPI first', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        runResult.assertFileContent(
            'testdir/CLAUDE.md',
            'https://cedardevdocs.z2.web.core.usgovcloudapi.net/components/index.json',
        );
        runResult.assertFileContent('testdir/CLAUDE.md', 'Preferred lookup order:');
        runResult.assertFileContent('testdir/CLAUDE.md', 'Live environment URL with `curl | jq`');
    }).timeout(5000);
});

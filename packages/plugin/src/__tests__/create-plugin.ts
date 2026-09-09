// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import path from 'path';
import helpers, { RunResult } from 'yeoman-test';

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

    it('scaffolds INSTRUCTIONS.md and skills for the generic choice', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'generic' });

        runResult.assertFile([
            'testdir/INSTRUCTIONS.md',
            ...skillNames.map((skill) => `testdir/.agents/skills/${skill}/SKILL.md`),
        ]);
        runResult.assertFileContent('testdir/INSTRUCTIONS.md', '# test');
        runResult.assertNoFile([
            'testdir/CLAUDE.md',
            'testdir/AGENTS.md',
            'testdir/.claude/skills/plan-widget/SKILL.md',
            'testdir/_agent-instructions/INSTRUCTIONS.md',
        ]);
    }).timeout(5000);

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

        // Storybook builds the story index by statically re-parsing the options block as
        // plain JavaScript, so a type annotation inside storySort makes /index.json 500.
        runResult.assertNoFileContent('testdir/.storybook/preview.tsx', 'storySort: (a: ');
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

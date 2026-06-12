// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import path from 'path';
import helpers, { RunResult } from 'yeoman-test';

describe('create-plugin', () => {
    const appGenerator = path.join(__dirname, '../generators/app');
    const skillNames = [
        'plan-widget',
        'add-widget',
        'plan-payment-gateway',
        'add-payment-gateway',
        'render-evoke-forms',
        'build-criteria-filters',
        'send-correspondence',
        'storybook-tdd',
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

    it('copies skill bodies verbatim', async () => {
        runResult = await helpers
            .run(appGenerator)
            .withPrompts({ projectName: 'test', dirName: 'testdir', agentInstructions: 'claude' });

        runResult.assertFileContent(
            'testdir/.claude/skills/build-criteria-filters/SKILL.md',
            '| `$in`        | `inq`      |',
        );
    }).timeout(5000);
});

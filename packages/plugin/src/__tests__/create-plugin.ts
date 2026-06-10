// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import path from 'path';
import helpers, { RunResult } from 'yeoman-test';

describe('create-plugin', () => {
    const appGenerator = path.join(__dirname, '../generators/app');
    let runResult: RunResult;

    afterEach(() => {
        runResult?.restore();
    });

    it('uses prompt to name resulting package', async () => {
        runResult = await helpers.run(appGenerator).withPrompts({ projectName: 'test', dirName: 'testdir' });

        runResult.assertFile(['testdir/package.json']);
        runResult.assertJsonFileContent('testdir/package.json', {
            name: 'test',
        });
    }).timeout(5000);

    it('does not copy internal agent instruction templates', async () => {
        runResult = await helpers.run(appGenerator).withPrompts({ projectName: 'test', dirName: 'testdir' });

        runResult.assertNoFile([
            'testdir/_agent-instructions/INSTRUCTIONS.md',
            'testdir/_agent-instructions/skills/plan-widget/SKILL.md',
            'testdir/_agent-instructions/skills/add-widget/SKILL.md',
            'testdir/_agent-instructions/skills/plan-payment-gateway/SKILL.md',
            'testdir/_agent-instructions/skills/add-payment-gateway/SKILL.md',
            'testdir/_agent-instructions/skills/package-and-upload/SKILL.md',
        ]);
    }).timeout(5000);
});

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import helpers, { RunResult } from 'yeoman-test';

import path from 'path';

describe('create-widgets-package', () => {
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
    });
});

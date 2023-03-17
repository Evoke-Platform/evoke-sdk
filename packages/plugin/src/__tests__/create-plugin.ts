'use strict';

import path from 'path';
import assert from 'yeoman-assert';
import helpers from 'yeoman-test';

describe('create-plugin', () => {
    before(() => {
        return helpers
            .run(path.join(__dirname, '../generators/app'))
            .withPrompts({ projectName: 'test', dirName: 'testdir' });
    });

    it('creates files', () => {
        assert.file(['testdir/package.json']);
    });
});

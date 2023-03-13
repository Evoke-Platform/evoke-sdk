'use strict';
const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');

describe('create-module', () => {
    before(() => {
        return helpers
            .run(path.join(__dirname, '../dist/generators/app'))
            .withPrompts({ projectName: 'test', dirName: 'testdir' });
    }, 20000);

    it('creates files', () => {
        assert.file(['testdir/package.json']);
    });
});

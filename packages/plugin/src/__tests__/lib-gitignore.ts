// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import assert from 'assert';
import { GITIGNORE_HEADER, mergeGitignore } from '../lib/gitignore';

const TEMPLATE = [
    'node_modules/',
    '',
    '# Build output',
    'dist/',
    'storybook-static/',
    '',
    '.openapi/',
    '*.log',
    '',
].join('\n');

describe('mergeGitignore', () => {
    it('returns the template when the project has no .gitignore', () => {
        assert.strictEqual(mergeGitignore(undefined, TEMPLATE), TEMPLATE);
    });

    it('appends only the missing lines under one header', () => {
        const existing = 'node_modules/\ndist/\n';
        const merged = mergeGitignore(existing, TEMPLATE);

        assert.strictEqual(
            merged,
            `node_modules/\ndist/\n\n${GITIGNORE_HEADER}\nstorybook-static/\n.openapi/\n*.log\n`,
        );
    });

    it('returns the same string when nothing is missing', () => {
        const existing = 'node_modules/\ndist/\nstorybook-static/\n.openapi/\n*.log\n';

        assert.strictEqual(mergeGitignore(existing, TEMPLATE), existing);
    });

    it('is idempotent: merging its own output adds nothing', () => {
        const once = mergeGitignore('node_modules/\n', TEMPLATE);
        const twice = mergeGitignore(once, TEMPLATE);

        assert.strictEqual(twice, once);
        assert.strictEqual(once.split(GITIGNORE_HEADER).length - 1, 1);
    });

    it('ignores surrounding whitespace and CRLF when matching existing lines', () => {
        const existing = 'node_modules/ \r\ndist/\r\n';
        const merged = mergeGitignore(existing, TEMPLATE);

        assert.ok(!merged.includes('\nnode_modules/\n'), 'node_modules/ was appended a second time');
        assert.ok(merged.includes('storybook-static/'));
    });

    it('starts the header on its own line when the file lacks a trailing newline', () => {
        const merged = mergeGitignore('node_modules/', TEMPLATE);

        assert.ok(merged.startsWith('node_modules/\n'), merged);
        assert.ok(merged.includes(`\n${GITIGNORE_HEADER}\n`));
    });

    it('does not treat template comments as entries', () => {
        const merged = mergeGitignore('node_modules/\n', TEMPLATE);

        assert.ok(!merged.includes('# Build output'));
    });
});

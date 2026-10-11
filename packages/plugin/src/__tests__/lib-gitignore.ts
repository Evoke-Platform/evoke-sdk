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

    it('matches entries with and without a trailing slash', () => {
        const merged = mergeGitignore('node_modules\ndist\n', TEMPLATE);

        assert.ok(merged.startsWith('node_modules\ndist\n\n'), merged);
        assert.strictEqual(merged.split('node_modules').length - 1, 1, merged);
        assert.strictEqual(merged.split('dist').length - 1, 1, merged);
        assert.ok(merged.includes('storybook-static/'));
    });

    it('matches an anchored existing entry against the template entry', () => {
        const merged = mergeGitignore('node_modules/\n/dist/\n', TEMPLATE);

        assert.strictEqual(merged.split('dist').length - 1, 1, merged);
        assert.ok(merged.includes(`${GITIGNORE_HEADER}\nstorybook-static/\n`));
    });

    it('keeps CRLF files CRLF: the appended block has no bare LF', () => {
        const merged = mergeGitignore('node_modules/\r\n', TEMPLATE);

        assert.ok(merged.startsWith('node_modules/\r\n'), merged);
        assert.ok(merged.includes(GITIGNORE_HEADER));
        assert.ok(merged.endsWith('\r\n'));
        assert.ok(!/(?<!\r)\n/.test(merged), JSON.stringify(merged));
    });

    it('keeps CRLF when the file lacks a final newline', () => {
        const merged = mergeGitignore('node_modules/\r\ndist/', TEMPLATE);

        assert.ok(merged.startsWith('node_modules/\r\ndist/\r\n'), JSON.stringify(merged));
        assert.ok(!/(?<!\r)\n/.test(merged), JSON.stringify(merged));
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

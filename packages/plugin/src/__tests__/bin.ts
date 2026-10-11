// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import assert from 'assert';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeYearOldProject } from './fixtures';

const bin = path.join(__dirname, '../../bin/create-plugin.js');

function runBin(args: string[], cwd: string, env?: NodeJS.ProcessEnv) {
    return spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8', timeout: 15000, env });
}

describe('create-plugin bin', function () {
    this.timeout(20000);

    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ait61-bin-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('rejects an unknown command with usage and exit code 1', () => {
        const result = runBin(['bogus'], dir);

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /Unknown command 'bogus'/);
        assert.match(result.stderr, /add-plugin-agent/);
    });

    it('refuses to add the Plugin Agent outside a plugin project, with a message and no stack', () => {
        const result = runBin(['add-plugin-agent', '--skills', 'claude', '--env-url', ''], dir);

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /Not an Evoke plugin project/);
        assert.doesNotMatch(result.stderr, /at .*\.js:\d+/);
        assert.deepStrictEqual(fs.readdirSync(dir), []);
    });

    it('reports a broken package.json as not a plugin project, naming the parse error', () => {
        fs.writeFileSync(path.join(dir, 'package.json'), '{ "name": ');

        const result = runBin(['add-plugin-agent', '--skills', 'claude', '--env-url', ''], dir);

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /could not be parsed/);
    });

    it('prints help for add-plugin-agent listing its options', () => {
        const result = runBin(['add-plugin-agent', '--help'], dir);

        assert.strictEqual(result.status, 0, result.stderr);
        assert.match(result.stdout, /--skills/);
        assert.match(result.stdout, /--env-url/);
        assert.match(result.stdout, /--add-test-tooling/);
    });

    it('prints the same help for -h', () => {
        const result = runBin(['add-plugin-agent', '-h'], dir);

        assert.strictEqual(result.status, 0, result.stderr);
        assert.match(result.stdout, /--skills/);
    });

    it('adds the agent files to a year-old project from the command line', () => {
        writeYearOldProject(dir);

        const result = runBin(
            ['add-plugin-agent', '--skills', 'agents', '--env-url', 'https://cli.example.com', '--no-add-test-tooling'],
            dir,
        );

        assert.strictEqual(result.status, 0, result.stderr);
        assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')));
        assert.ok(fs.existsSync(path.join(dir, '.agents/skills/plan-widget/SKILL.md')));
        assert.match(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), /Base URL: https:\/\/cli\.example\.com/);

        // Yeoman's logger (this.log.ok / writeln and the per-file create/identical lines)
        // writes to stderr, not stdout. Only console.log output lands on stdout.
        assert.match(result.stderr, /Plugin Agent \(beta\) added to tabs-unlimited/);
        assert.match(result.stderr, /not added/);
    });

    // yeoman-test never queues the install task, so the install trigger is checked through the real bin.
    it('still runs the package manager install when the tooling was added to package.json', () => {
        writeYearOldProject(dir);

        // A stand-in npm that records its arguments, so no real install runs.
        const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'ait61-npm-stub-'));
        const record = path.join(stubs, 'npm-args.txt');

        try {
            fs.writeFileSync(path.join(stubs, 'npm'), `#!/bin/sh\necho "$@" >> "${record}"\n`, { mode: 0o755 });

            const result = runBin(
                ['add-plugin-agent', '--skills', 'claude', '--env-url', '', '--add-test-tooling'],
                dir,
                {
                    ...process.env,
                    PATH: `${stubs}${path.delimiter}${process.env.PATH}`,
                },
            );

            assert.strictEqual(result.status, 0, result.stderr);
            assert.match(result.stderr, /Changes to package\.json were detected/);
            assert.ok(fs.existsSync(record), result.stderr);
            assert.strictEqual(fs.readFileSync(record, 'utf8').trim(), 'install');
        } finally {
            fs.rmSync(stubs, { recursive: true, force: true });
        }
    });

    it('honours --force for a conflicting CLAUDE.md', () => {
        writeYearOldProject(dir);
        fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# hand written\n');

        const result = runBin(
            ['add-plugin-agent', '--skills', 'claude', '--env-url', '', '--no-add-test-tooling', '--force'],
            dir,
        );

        assert.strictEqual(result.status, 0, result.stderr);
        assert.strictEqual(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').trim(), '@AGENTS.md');
    });

    it('honours -f like --force for a conflicting CLAUDE.md', () => {
        writeYearOldProject(dir);
        fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# hand written\n');

        const result = runBin(
            ['add-plugin-agent', '--skills', 'claude', '--env-url', '', '--no-add-test-tooling', '-f'],
            dir,
        );

        assert.strictEqual(result.status, 0, result.stderr);
        assert.strictEqual(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8').trim(), '@AGENTS.md');
    });
});

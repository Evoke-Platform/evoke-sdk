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

// A stand-in npm that records its arguments, so no real install runs. It is written twice because
// a shell script is ignored on Windows, where `npm` resolves to npm.cmd. The environment puts the
// stub folder first under the PATH key the environment really uses: on Windows that is usually `Path`,
// and adding a second `PATH` key would leave it undefined which of the two the child sees.
function stubNpm() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ait61-npm-stub-'));
    const record = path.join(dir, 'npm-args.txt');

    fs.writeFileSync(path.join(dir, 'npm'), `#!/bin/sh\necho "$@" >> "${record}"\n`, { mode: 0o755 });
    fs.writeFileSync(path.join(dir, 'npm.cmd'), `@echo %*>>"${record}"\r\n`);

    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
    const env: NodeJS.ProcessEnv = {
        ...process.env,
        [pathKey]: `${dir}${path.delimiter}${process.env[pathKey] ?? ''}`,
    };

    return { dir, record, env };
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

        for (const option of [
            '--skills claude|agents',
            '--env-url <url>',
            '--add-test-tooling',
            '--no-add-test-tooling',
            '-f, --force',
            '--skip-install',
            '-h, --help',
        ]) {
            assert.ok(result.stdout.includes(option), `help should list ${option}:\n${result.stdout}`);
        }

        // Our own usage text, not Yeoman's generated one.
        assert.doesNotMatch(result.stdout, /yo evoke-platform/);
        assert.match(result.stdout, /npx @evoke-platform\/plugin add-plugin-agent/);
        assert.deepStrictEqual(fs.readdirSync(dir), []);
    });

    it('prints the same help for -h', () => {
        const long = runBin(['add-plugin-agent', '--help'], dir);
        const short = runBin(['add-plugin-agent', '-h'], dir);

        assert.strictEqual(short.status, 0, short.stderr);
        assert.strictEqual(short.stdout, long.stdout);
        assert.match(short.stdout, /--skills/);
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

        const { dir: stubs, record, env } = stubNpm();

        try {
            const result = runBin(
                ['add-plugin-agent', '--skills', 'claude', '--env-url', '', '--add-test-tooling'],
                dir,
                env,
            );

            assert.strictEqual(result.status, 0, result.stderr);
            assert.match(result.stderr, /Changes to package\.json were detected/);
            assert.ok(fs.existsSync(record), result.stderr);
            assert.strictEqual(fs.readFileSync(record, 'utf8').trim(), 'install');
        } finally {
            fs.rmSync(stubs, { recursive: true, force: true });
        }
    });

    it('does not run the package manager install when --skip-install is passed', () => {
        writeYearOldProject(dir);

        const { dir: stubs, record, env } = stubNpm();

        try {
            const result = runBin(
                ['add-plugin-agent', '--skills', 'claude', '--env-url', '', '--add-test-tooling', '--skip-install'],
                dir,
                env,
            );

            assert.strictEqual(result.status, 0, result.stderr);
            // The tooling was still written to package.json; only the install was skipped.
            assert.match(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), /"test-storybook"/);
            assert.ok(
                !fs.existsSync(record),
                `npm was called: ${fs.existsSync(record) && fs.readFileSync(record, 'utf8')}`,
            );
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

    // spawnSync gives the child a pipe for stdin, so no terminal is attached.
    it('stops without a terminal before replacing a CLAUDE.md, with a message and no stack', () => {
        writeYearOldProject(dir);
        fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# hand written\n');

        const result = runBin(
            ['add-plugin-agent', '--skills', 'claude', '--env-url', '', '--no-add-test-tooling'],
            dir,
        );

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /cannot ask before replacing these files: CLAUDE\.md/);
        assert.match(result.stderr, /pass --force to replace them/);
        assert.doesNotMatch(result.stderr, /^\s+at /m);
        assert.doesNotMatch(result.stderr, /ERR_USE_AFTER_CLOSE/);
        assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')));
        assert.ok(!fs.existsSync(path.join(dir, '.claude')));
        assert.strictEqual(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), '# hand written\n');
        assert.strictEqual(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), 'node_modules/\ndist/\n');
    });

    it('stops without a terminal when --skills is missing, with a message and no stack', () => {
        writeYearOldProject(dir);

        const result = runBin(['add-plugin-agent', '--env-url', '', '--no-add-test-tooling'], dir);

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /cannot ask which tool runs the agent\. Pass --skills claude or --skills agents\./);
        assert.doesNotMatch(result.stderr, /^\s+at /m);
        assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')));
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

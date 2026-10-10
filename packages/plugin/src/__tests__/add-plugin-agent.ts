// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import helpers, { RunResult } from 'yeoman-test';
import {
    MID_ERA_CLAUDE_MD,
    MID_ERA_SKILL,
    writeCurrentProject,
    writeMidEraProject,
    writeYearOldProject,
} from './fixtures';

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

const agentItems = (skills: 'claude' | 'agents') => [
    'AGENTS.md',
    'CLAUDE.md',
    'scripts/fetch-openapi-specs.sh',
    'plans/.gitkeep',
    ...skillNames.map((skill) => `.${skills}/skills/${skill}/SKILL.md`),
];

// Answers every prompt through options so a test only names what it is about.
const quiet = { skills: 'claude', 'env-url': '', 'add-test-tooling': false };

describe('add-plugin-agent', () => {
    const generator = path.join(__dirname, '../generators/add-plugin-agent');
    let runResult: RunResult | undefined;

    afterEach(() => {
        runResult?.restore();
        runResult = undefined;
    });

    it('adds the five agent items to a year-old project without touching anything else', async () => {
        runResult = await helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);

        runResult.assertFile(agentItems('claude'));
        runResult.assertFileContent('AGENTS.md', '# tabs-unlimited');
        runResult.assertFileContent('AGENTS.md', 'Base URL: _not set_');
        runResult.assertFileContent('CLAUDE.md', '@AGENTS.md');
        runResult.assertNoFile(['.agents/skills/plan-widget/SKILL.md', 'INSTRUCTIONS.md', '.yo-rc.json']);

        // Untouched: widget source, storybook config, package.json.
        runResult.assertFileContent('src/widgets/Tabs/index.tsx', 'export default function Tabs()');
        runResult.assertNoFileContent('package.json', 'test-storybook');
        runResult.assertNoFile(['test-runner-jest.config.js', 'src/mocks/evokeHandlers.ts']);
    }).timeout(10000);

    it('puts skills under .agents/skills when asked', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ ...quiet, skills: 'agents' });

        runResult.assertFile(agentItems('agents'));
        runResult.assertNoFile(['.claude/skills/plan-widget/SKILL.md']);
    }).timeout(10000);

    it('reads the project name from package.json and the URL from --env-url', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir((dir) => writeYearOldProject(dir, '@acme/intake-widgets'))
            .withOptions({ ...quiet, 'env-url': 'https://acme.example.com/' });

        runResult.assertFileContent('AGENTS.md', '# @acme/intake-widgets');
        runResult.assertFileContent('AGENTS.md', 'Base URL: https://acme.example.com\n');
    }).timeout(10000);

    it('answers the two prompts when no options are given', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ 'add-test-tooling': false })
            .withPrompts({ skills: 'agents', environmentUrl: 'https://prompted.example.com' });

        runResult.assertFile('.agents/skills/plan-widget/SKILL.md');
        runResult.assertFileContent('AGENTS.md', 'Base URL: https://prompted.example.com');
    }).timeout(10000);

    it('merges .gitignore: original lines once, missing lines under one header', async () => {
        runResult = await helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);

        const content = fs.readFileSync(path.join(runResult.cwd, '.gitignore'), 'utf8');

        assert.ok(content.startsWith('node_modules/\ndist/\n'), content);
        assert.strictEqual(content.split('node_modules/').length - 1, 1);
        assert.strictEqual(content.split('# Added by @evoke-platform/plugin add-plugin-agent').length - 1, 1);
        assert.ok(content.includes('.openapi/'));
        assert.ok(content.includes('storybook-static/'));
    }).timeout(10000);

    it('merges .gitignore and package.json without an overwrite prompt', async () => {
        // The year-old fixture has no agent files and no tooling files, so .gitignore and
        // package.json are the only existing files the generator touches. Every conflict
        // answer is 'abort': if either file reached the prompt, the run would reject.
        runResult = await helpers
            .run(generator)
            .doInDir(writeYearOldProject)
            .withOptions({ ...quiet, force: false, 'add-test-tooling': true })
            .withPrompts({ action: 'abort' });

        const onDisk = (file: string) => fs.readFileSync(path.join(runResult!.cwd, file), 'utf8');
        const pkg = JSON.parse(onDisk('package.json'));

        assert.ok(onDisk('.gitignore').includes('# Added by @evoke-platform/plugin add-plugin-agent'));
        assert.ok(onDisk('.gitignore').includes('.openapi/'));
        assert.ok(pkg.scripts['test-storybook']);
        assert.ok(pkg.devDependencies.msw);
        assert.ok(fs.existsSync(path.join(runResult.cwd, 'test-runner-jest.config.js')));
    }).timeout(10000);

    it('leaves a customized CLAUDE.md and skill alone when the developer answers skip', async () => {
        // yeoman-test forces overwrites by default; turn that off so the conflict prompt
        // fires, and answer it the way a cautious developer would.
        runResult = await helpers
            .run(generator)
            .doInDir(writeMidEraProject)
            .withOptions({ ...quiet, force: false })
            .withPrompts({ action: 'skip' });

        // RunResult's assertions read Yeoman's in-memory store, which still holds the skipped
        // content. What the developer keeps is what is on disk, so read the disk.
        const onDisk = (file: string) => fs.readFileSync(path.join(runResult!.cwd, file), 'utf8');

        assert.strictEqual(onDisk('CLAUDE.md'), MID_ERA_CLAUDE_MD);
        assert.strictEqual(onDisk('.claude/skills/build-widget/SKILL.md'), MID_ERA_SKILL);
        assert.ok(fs.existsSync(path.join(runResult.cwd, 'AGENTS.md')));
        assert.ok(fs.existsSync(path.join(runResult.cwd, '.claude/skills/plan-widget/SKILL.md')));
        assert.ok(onDisk('AGENTS.md').includes('# tabs-unlimited'));
    }).timeout(10000);

    it('replaces a customized CLAUDE.md with the import when forced', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeMidEraProject)
            .withOptions({ ...quiet, force: true });

        runResult.assertFileContent('CLAUDE.md', '@AGENTS.md');
        runResult.assertNoFileContent('CLAUDE.md', 'Guidance this team wrote by hand');
    }).timeout(10000);

    it('writes nothing new on a second run', async () => {
        runResult = await helpers.run(generator).doInDir(writeYearOldProject).withOptions(quiet);

        const projectDir = runResult.cwd;
        const before = snapshot(projectDir);

        // Second run in the same directory. force is off and every conflict answer is
        // 'abort' so any attempt to rewrite a differing file fails the test loudly.
        const second = await helpers
            .run(generator)
            .cd(projectDir)
            .withOptions({ ...quiet, force: false })
            .withPrompts({ action: 'abort' });

        assert.deepStrictEqual(snapshot(projectDir), before);
        second.restore();
    }).timeout(20000);

    it('refuses to run outside a plugin project and writes nothing', async () => {
        let projectDir = '';

        await assert.rejects(
            helpers
                .run(generator)
                .doInDir((dir) => {
                    projectDir = dir;
                    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'not-evoke' }));
                })
                .withOptions(quiet),
            { name: 'NotAPluginProjectError', message: /does not depend on/ },
        );

        assert.deepStrictEqual(fs.readdirSync(projectDir).sort(), ['package.json']);
    }).timeout(10000);

    it('refuses to run in an empty directory', async () => {
        let projectDir = '';

        await assert.rejects(
            helpers
                .run(generator)
                .doInDir((dir) => {
                    projectDir = dir;
                })
                .withOptions(quiet),
            { name: 'NotAPluginProjectError', message: /No package\.json/ },
        );

        assert.deepStrictEqual(fs.readdirSync(projectDir), []);
    }).timeout(10000);

    it('rejects an unknown --skills value before touching the project', async () => {
        let projectDir = '';

        await assert.rejects(
            helpers
                .run(generator)
                .doInDir((dir) => {
                    projectDir = dir;
                    writeYearOldProject(dir);
                })
                .withOptions({ ...quiet, skills: 'cursor' }),
            { name: 'UsageError', message: /--skills must be 'claude' or 'agents', got 'cursor'/ },
        );

        assert.ok(!fs.existsSync(path.join(projectDir, 'AGENTS.md')));
    }).timeout(10000);

    it('rejects a malformed --env-url', async () => {
        await assert.rejects(
            helpers
                .run(generator)
                .doInDir(writeYearOldProject)
                .withOptions({ ...quiet, 'env-url': 'acme.example.com' }),
            { name: 'UsageError', message: /--env-url: URL must start with https:\/\/ or http:\/\// },
        );
    }).timeout(10000);

    it('accepts a current scaffold and adds the agent files', async () => {
        runResult = await helpers
            .run(generator)
            .doInDir(writeCurrentProject)
            .withOptions({ skills: 'claude', 'env-url': '' });

        runResult.assertFile(agentItems('claude'));
        runResult.assertFileContent('AGENTS.md', '# current-widgets');
    }).timeout(10000);
});

// Relative path -> content and mtime for every file under dir, skipping node_modules.
function snapshot(dir: string): Record<string, { content: string; mtimeMs: number }> {
    const out: Record<string, { content: string; mtimeMs: number }> = {};
    const walk = (current: string) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (entry.name === 'node_modules') continue;

            const full = path.join(current, entry.name);

            if (entry.isDirectory()) {
                walk(full);
            } else {
                out[path.relative(dir, full)] = {
                    content: fs.readFileSync(full, 'utf8'),
                    mtimeMs: fs.statSync(full).mtimeMs,
                };
            }
        }
    };

    walk(dir);

    return out;
}

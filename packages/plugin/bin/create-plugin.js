#!/usr/bin/env node

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

const path = require('path');
const { createEnv } = require('yeoman-environment');
const packageJson = require('../package.json');

const APP = 'evoke-platform:plugin';
const ADD_PLUGIN_AGENT = 'evoke-platform:plugin:add-plugin-agent';

const USAGE = [
    'Usage:',
    '  npx @evoke-platform/plugin                        scaffold a new plugin project',
    '  npx @evoke-platform/plugin add-plugin-agent       add the Plugin Agent (beta) to the plugin project',
    '                                                    in the current directory',
    '  npx @evoke-platform/plugin add-plugin-agent [--force]',
    '  npx @evoke-platform/plugin add-plugin-agent --help',
].join('\n');

// Hand-written because Yeoman's generated help prints its own `yo ...` usage line and
// internals, and leaves out the options the environment (not the generator) reads.
const ADD_PLUGIN_AGENT_HELP = [
    'Usage: npx @evoke-platform/plugin add-plugin-agent [options]',
    '',
    'Adds the Plugin Agent (beta) to the plugin project in the current directory.',
    '',
    'Options:',
    '  --skills claude|agents          Skill folder, instead of the prompt',
    '  --env-url <url>                 Environment URL, instead of the prompt (empty string allowed)',
    '  --add-test-tooling              Answer yes to the tooling question without asking',
    '  --no-add-test-tooling           Answer the tooling question with no, without asking',
    '  -f, --force                     Overwrite conflicting files without asking',
    '  --skip-install                  Add the tooling but skip the install; run npm install yourself',
    '  -h, --help                      List these options',
].join('\n');

console.log(`${packageJson.name} v${packageJson.version}`);

const [command, ...rest] = process.argv.slice(2);

let namespace;
let args;

if (command === undefined || command.startsWith('-')) {
    // No subcommand: the original behavior. The scaffold has never read flags, and a
    // flag-first invocation keeps ignoring them, so nothing changes for existing users.
    namespace = APP;
    args = [];
} else if (command === 'add-plugin-agent') {
    namespace = ADD_PLUGIN_AGENT;
    args = rest;
} else {
    console.error(`Unknown command '${command}'.\n${USAGE}`);
    process.exit(1);
}

// --force and --skip-install (and the -f form) are read by the environment, not the generator:
// force switches off the per-file conflict prompt, skipInstall stops the package manager install
// Yeoman queues after package.json changes.
const force = args.includes('--force') || args.includes('-f');
const skipInstall = args.includes('--skip-install');
const help = args.includes('--help') || args.includes('-h');

if (namespace === ADD_PLUGIN_AGENT && help) {
    // Set the exit code and let the process end by itself: process.exit() can cut off piped
    // output on Windows.
    console.log(`\n${ADD_PLUGIN_AGENT_HELP}`);
    process.exitCode = 0;
} else {
    const env = createEnv([], { force, skipInstall });

    env.register(path.resolve(__dirname, '../dist/generators/app'), APP);
    env.register(path.resolve(__dirname, '../dist/generators/add-plugin-agent'), ADD_PLUGIN_AGENT);

    env.run([namespace, ...args]).catch((err) => {
        // These two carry a message written for the terminal; anything else is a bug and
        // keeps its stack.
        if (err && (err.name === 'NotAPluginProjectError' || err.name === 'UsageError')) {
            console.error(err.message);
        } else {
            console.error(err);
        }

        // The bare scaffold has always logged its errors and exited 0; keep that. The new command
        // exits 1 so scripts can tell it failed.
        if (namespace === ADD_PLUGIN_AGENT) {
            process.exitCode = 1;
        }
    });
}

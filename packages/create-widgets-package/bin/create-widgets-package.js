#!/usr/bin/env node

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

const path = require('path');
const env = require('yeoman-environment').createEnv();
const packageJson = require('../package.json');

console.log(`${packageJson.name} v${packageJson.version}`);

env.register(path.resolve(__dirname, '../dist/generators/app'), 'evoke-platform:plugin');

env.run('evoke-platform:plugin').catch((err) => {
    console.error(err);
});

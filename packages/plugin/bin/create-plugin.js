#!/usr/bin/env node

'use strict';

const path = require('path');
const env = require('yeoman-environment').createEnv();
const packageJson = require('../package.json');

console.log(`${packageJson.name} v${packageJson.version}`);

env.register(path.resolve(__dirname, '../dist/generators/app'), 'evoke-platform:plugin');

env.run('evoke-platform:plugin').catch((err) => {
    console.error(err);
});

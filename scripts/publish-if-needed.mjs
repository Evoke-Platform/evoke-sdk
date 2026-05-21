#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const packageName = packageJson.name;
const packageVersion = packageJson.version;

if (!packageName || !packageVersion) {
    throw new Error(`Unable to determine package name/version from ${packageJsonPath}`);
}

const packageSpecifier = `${packageName}@${packageVersion}`;
const npmViewResult = await runAndCollectOutput('npm', ['view', packageSpecifier, 'version', '--json']);

if (npmViewResult.code === 0) {
    console.log(`Skipping publish for ${packageSpecifier} because this version is already on npm.`);
    process.exit(0);
}

const npmViewOutput = `${npmViewResult.stdout}\n${npmViewResult.stderr}`;
const packageVersionIsMissing =
    npmViewOutput.includes('E404') || npmViewOutput.includes('404 Not Found') || npmViewOutput.includes('404');

if (!packageVersionIsMissing) {
    process.stderr.write(npmViewResult.stdout);
    process.stderr.write(npmViewResult.stderr);
    process.stderr.write(`Unable to verify whether ${packageSpecifier} is already published.\n`);
    process.exit(npmViewResult.code || 1);
}

const publishArgs = process.argv.slice(2);
const npmPublishResult = await runWithInheritedIo('npm', ['publish', ...publishArgs]);
process.exit(npmPublishResult.code || 1);

function runAndCollectOutput(command, args) {
    return new Promise((resolve) => {
        const childProcess = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        childProcess.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        childProcess.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        childProcess.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });
    });
}

function runWithInheritedIo(command, args) {
    return new Promise((resolve) => {
        const childProcess = spawn(command, args, { stdio: 'inherit' });
        childProcess.on('close', (code) => {
            resolve({ code });
        });
    });
}

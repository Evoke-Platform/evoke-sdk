#!/usr/bin/env node

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

const fs = require('fs');
const path = require('path');
const debug = require('debug')('plugin-scripts:generate-manifest');
const glob = require('glob').glob;
const { mkdirp } = require('mkdirp');
const Plugin = require('@evoke-platform/plugin-runtime');
const ts = require('typescript');
const tmp = require('tmp-promise');
const { compile, readCompilerOptions } = require('../dist');

async function main() {
    const packageJson = require(`${process.cwd()}/package.json`);
    const tmpdir = 'tmp';

    await mkdirp(tmpdir);

    Plugin.startWidgetDeclarations(packageJson.version);

    await tmp.withDir(
        async (outDir) => {
            const config = readCompilerOptions();
            const rootDir = config.rootDir || 'src';

            config.rootDir = rootDir;

            await compileProject(config, outDir.path);
            await scan(outDir.path, rootDir);
        },
        { unsafeCleanup: true, tmpdir },
    );

    const widgets = Plugin.getWidgets();

    if (widgets.length === 0) {
        console.log('No widgets detected, aborting');

        process.exit(2);
    }

    printWidgets(widgets);
    validateWidgets(widgets);

    const manifest = createManifest(packageJson, widgets);
    const manifestPath = 'dist/manifest.json';

    await mkdirp('dist');

    saveManifest(manifest, manifestPath);

    console.log(`Manifest generated at ${manifestPath}`);
}

async function compileProject(config, outDir) {
    config.outDir = outDir;
    config.module = ts.ModuleKind.CommonJS;
    config.skipLibCheck = true;

    await compile(config);
}

async function scan(dir, rootDir) {
    debug(`Scanning ${dir} for widgets...`);

    const files = await glob(`${dir}/**/*.js`, { withFileTypes: true });

    if (!files.length) {
        debug('no source files matching *.js found');
    }

    for (const file of files) {
        const relativePath = path.relative(dir, file.fullpath());
        let importModule;

        debug('scanning file %s', relativePath);

        Plugin.context.modulePath = `${rootDir}/${stripExtension(relativePath)}`;

        const widgetCount = Plugin.getWidgets().length;

        try {
            importModule = require(file.fullpath());
        } catch (err) {
            console.error(`Error parsing ${file}: ${err}`);

            debug(err);
        }

        const newWidgets = Plugin.getWidgets().length - widgetCount;

        debug('found %d widgets', newWidgets);

        if (newWidgets > 1) {
            throw new Error(`Multiple widgets declared in ${relativePath}, make sure each widget has its own module`);
        } else if (newWidgets === 1) {
            debug('default export is %s', typeof importModule.default);

            if (typeof importModule.default !== 'function') {
                throw new Error(
                    `No widget exported in ${relativePath}, make sure widgets are exported as the default export`,
                );
            }
        }
    }
}

function stripExtension(filePath) {
    const parsedPath = path.parse(filePath);
    const extLength = parsedPath.ext?.length ?? 0;

    return filePath.substring(0, filePath.length - extLength);
}

function printWidgets(widgets) {
    for (const widget of widgets) {
        console.log(`Detected widget ${widget.id} (${widget.name})`);
    }
}

function validateWidgets(widgets) {
    const widgetIds = new Set();

    for (const widget of widgets) {
        if (widgetIds.has(widget.id)) {
            console.error(`Duplicate widget id ${widget.id}, each widget must have a unique id!`);

            process.exit(3);
        }
    }
}

function createManifest(packageJson, widgets) {
    return {
        name: packageJson.name,
        description: packageJson.description,
        widgets,
    };
}

async function saveManifest(manifest, path) {
    await fs.promises.writeFile(path, JSON.stringify(manifest, undefined, 2), 'utf-8');
}

main().catch((err) => {
    console.error(err);
});

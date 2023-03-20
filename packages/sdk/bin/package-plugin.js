#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function generate() {
    const zip = new JSZip();
    const distDir = path.resolve(process.cwd(), './dist');
    const targetDir = path.resolve(process.cwd(), './target');
    const target = path.resolve(targetDir, './plugin.zip');

    console.log(`Generating plugin from contents in ${distDir}`);

    await addContentsToZip(zip, distDir);
    await fs.promises.mkdir(targetDir);

    const zipStream = zip.generateNodeStream();
    const outStream = fs.createWriteStream(target);

    await new Promise((resolve, reject) => {
        zipStream.pipe(outStream);

        outStream.on('finish', resolve);
        zipStream.on('error', (err) => {
            outStream.end();
            reject(err);
        });
    });

    console.log(`Plugin generated at ${target}`);
}

async function addContentsToZip(zip, dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.resolve(dir, `./${entry.name}`);

        if (entry.isFile()) {
            zip.file(entry.name, fs.createReadStream(entryPath));
        } else if (entry.isDirectory()) {
            const zipView = zip.folder(entry.name);

            await addContentsToZip(zipView, entryPath);
        }
    }
}

generate().catch((err) => {
    console.error(err);
});

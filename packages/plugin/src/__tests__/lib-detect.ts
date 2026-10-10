// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

'use strict';

import assert from 'assert';
import { detectPluginProject } from '../lib/detect';

describe('detectPluginProject', () => {
    const dir = '/work/my-widgets';

    it('accepts a project that depends on plugin-scripts', () => {
        const raw = JSON.stringify({
            name: 'my-widgets',
            devDependencies: { '@evoke-platform/plugin-scripts': '^1.0.0' },
        });
        const result = detectPluginProject(raw, dir);

        assert.strictEqual(result.projectName, 'my-widgets');
        assert.deepStrictEqual(result.pkg.devDependencies, { '@evoke-platform/plugin-scripts': '^1.0.0' });
    });

    it('accepts a project that depends only on the sdk', () => {
        const raw = JSON.stringify({ name: 'x', dependencies: { '@evoke-platform/sdk': '^1.0.0' } });

        assert.strictEqual(detectPluginProject(raw, dir).projectName, 'x');
    });

    it('falls back to the directory name when package.json has no name', () => {
        // Older hand-edited projects sometimes drop the name. AGENTS.md still needs a heading.
        const raw = JSON.stringify({ dependencies: { '@evoke-platform/sdk': '^1.0.0' } });

        assert.strictEqual(detectPluginProject(raw, dir).projectName, 'my-widgets');
    });

    it('rejects a missing package.json', () => {
        assert.throws(() => detectPluginProject(undefined, dir), {
            name: 'NotAPluginProjectError',
            message: /Not an Evoke plugin project: \/work\/my-widgets[\s\S]*No package\.json/,
        });
    });

    it('rejects a package.json that is not valid JSON, naming the parse error', () => {
        assert.throws(() => detectPluginProject('{ "name": ', dir), {
            name: 'NotAPluginProjectError',
            message: /could not be parsed/,
        });
    });

    it('rejects a package.json without an Evoke dependency', () => {
        const raw = JSON.stringify({ name: 'not-evoke', dependencies: { react: '^18.0.0' } });

        assert.throws(() => detectPluginProject(raw, dir), {
            name: 'NotAPluginProjectError',
            message: /does not depend on @evoke-platform\/plugin-scripts or @evoke-platform\/sdk/,
        });
    });

    it('rejects a package.json whose top level is not an object', () => {
        assert.throws(() => detectPluginProject('[]', dir), { name: 'NotAPluginProjectError' });
    });
});

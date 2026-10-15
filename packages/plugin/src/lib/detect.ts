// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import path from 'path';

export type PackageJson = {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    msw?: { workerDirectory?: string | string[] };
};

// Either package marks a project scaffolded by this generator. Year-old projects have both;
// a hand-trimmed one might keep only the sdk.
export const EVOKE_PLUGIN_PACKAGES = ['@evoke-platform/plugin-scripts', '@evoke-platform/sdk'];

export class NotAPluginProjectError extends Error {
    constructor(projectDir: string, reason: string) {
        super(
            `Not an Evoke plugin project: ${projectDir}\n${reason}\n` +
                'Run this command from the root of a project created by @evoke-platform/plugin.',
        );
        this.name = 'NotAPluginProjectError';
    }
}

export type DetectedProject = { projectName: string; pkg: PackageJson };

export function detectPluginProject(rawPackageJson: string | undefined, projectDir: string): DetectedProject {
    if (rawPackageJson === undefined) {
        throw new NotAPluginProjectError(projectDir, 'No package.json found in this directory.');
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(rawPackageJson);
    } catch (err) {
        throw new NotAPluginProjectError(projectDir, `package.json could not be parsed: ${(err as Error).message}`);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new NotAPluginProjectError(projectDir, 'package.json is not a JSON object.');
    }

    const pkg = parsed as PackageJson;
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };

    if (!EVOKE_PLUGIN_PACKAGES.some((name) => name in declared)) {
        throw new NotAPluginProjectError(
            projectDir,
            `package.json does not depend on ${EVOKE_PLUGIN_PACKAGES.join(' or ')}.`,
        );
    }

    const projectName = typeof pkg.name === 'string' && pkg.name ? pkg.name : path.basename(projectDir);

    return { projectName, pkg };
}

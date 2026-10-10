// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export const GITIGNORE_HEADER = '# Added by @evoke-platform/plugin add-plugin-agent';

function entries(content: string): string[] {
    return content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#'));
}

// Append the template entries the project lacks, under one header. Existing lines are
// never rewritten or reordered, and a second merge finds nothing missing, so the
// returned string is the input itself.
export function mergeGitignore(existing: string | undefined, template: string): string {
    if (existing === undefined) {
        return template;
    }

    const present = new Set(entries(existing));
    const missing = entries(template).filter((entry) => !present.has(entry));

    if (missing.length === 0) {
        return existing;
    }

    const separator = existing === '' || existing.endsWith('\n') ? '' : '\n';

    return `${existing}${separator}\n${GITIGNORE_HEADER}\n${missing.join('\n')}\n`;
}

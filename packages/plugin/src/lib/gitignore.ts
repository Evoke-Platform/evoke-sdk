// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export const GITIGNORE_HEADER = '# Added by @evoke-platform/plugin add-plugin-agent';

function entries(content: string): string[] {
    return content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '' && !line.startsWith('#'));
}

// "node_modules", "node_modules/" and "/node_modules/" are one entry for matching purposes.
// Only the comparison is loose; lines that are truly missing are written in the template's form.
function keyOf(entry: string): string {
    return entry.replace(/^\//, '').replace(/\/$/, '');
}

// Append the template entries the project lacks, under one header. Existing lines are
// never rewritten or reordered, and a second merge finds nothing missing, so the
// returned string is the input itself.
export function mergeGitignore(existing: string | undefined, template: string): string {
    if (existing === undefined) {
        return template;
    }

    const present = new Set(entries(existing).map(keyOf));
    const missing = entries(template).filter((entry) => !present.has(keyOf(entry)));

    if (missing.length === 0) {
        return existing;
    }

    // Keep a CRLF file CRLF: the appended block uses the file's own line ending.
    const eol = existing.includes('\r\n') ? '\r\n' : '\n';
    const separator = existing === '' || existing.endsWith('\n') ? '' : eol;

    return `${existing}${separator}${eol}${GITIGNORE_HEADER}${eol}${missing.join(eol)}${eol}`;
}

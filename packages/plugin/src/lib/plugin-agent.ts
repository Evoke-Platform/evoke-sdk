// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import type { Editor } from 'mem-fs-editor';

// The instructions are one file for everyone; the skills are not, and cannot be.
//
// AGENTS.md is the cross-tool standard stewarded by the Agentic AI Foundation, read by
// Codex, Cursor, Copilot's coding agent, Gemini CLI and around twenty other tools. Claude
// Code reads it too, but only when no CLAUDE.md sits beside it, and not at all in sessions
// where that support is unavailable. So every project gets AGENTS.md plus a CLAUDE.md
// holding a single `@AGENTS.md` import. That is Anthropic's documented way to share one
// file, and it keeps working wherever reading AGENTS.md directly does not.
//
// Skills are the part that stays split. Claude Code discovers them only under
// .claude/skills and reads nothing under .agents/, while .agents/skills is the cross-tool
// convention Codex, Cursor and Copilot settled on. No single directory serves both.
// Symlinking one at the other would, but Git checks symlinks out as plain text files on
// Windows without extra setup, which would leave those clones with no skills at all. So
// the developer picks, and that choice decides only where the skills land.
//
// Two generators write these files: the new-project scaffold and `add-plugin-agent` for
// projects that already exist. They differ in where they run, not in what they write, so
// the file list lives here and each generator passes in its own file editor and paths.
export type SkillLocation = 'claude' | 'agents';

export const INSTRUCTION_FILE = 'AGENTS.md';
export const CLAUDE_IMPORT_FILE = 'CLAUDE.md';
export const SCRIPTS_DIR = 'scripts';
export const PLANS_DIR = 'plans';

export const skillDirectories: Record<SkillLocation, string> = {
    claude: '.claude/skills',
    agents: '.agents/skills',
};

export const SKILL_LOCATION_CHOICES: { name: string; value: SkillLocation }[] = [
    { name: 'Claude Code — skills in .claude/skills', value: 'claude' },
    { name: 'Codex, Cursor, Copilot and others — skills in .agents/skills', value: 'agents' },
];

export function isSkillLocation(value: unknown): value is SkillLocation {
    return value === 'claude' || value === 'agents';
}

export function normalizeEnvironmentUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
}

export function validateEnvironmentUrl(value: string): true | string {
    if (!value) return true;
    if (/^https?:\/\//.test(value)) return true;

    return 'URL must start with https:// or http://';
}

// Whether a CLAUDE.md pulls AGENTS.md in. Claude Code ignores AGENTS.md when a CLAUDE.md sits
// beside it, so a developer who keeps a hand-written CLAUDE.md gets the new instructions only if
// that file imports them. The import is written the way Claude Code writes one, `@AGENTS.md` or
// `@./AGENTS.md`, as a token of its own: at the start of a line or after whitespace, and followed
// by whitespace or the end of the file. A hand-written file may hold it among other lines, so it
// is looked for anywhere and not only as the whole file.
export function importsAgentsFile(claudeMd: string): boolean {
    return /(^|\s)@(\.\/)?AGENTS\.md(?=\s|$)/.test(claudeMd);
}

export type PluginAgentAnswers = {
    projectName: string;
    skills: SkillLocation;
    environmentUrl: string;
};

export type PluginAgentHost = {
    fs: Editor;
    templatePath(...segments: string[]): string;
    destinationPath(...segments: string[]): string;
};

// Call the host's path methods on the host; they read the generator's roots through `this`.
export function writePluginAgentFiles(host: PluginAgentHost, answers: PluginAgentAnswers): void {
    host.fs.copyTpl(host.templatePath('_agent-instructions/INSTRUCTIONS.md'), host.destinationPath(INSTRUCTION_FILE), {
        projectName: answers.projectName,
        environmentUrl: answers.environmentUrl,
    });

    // A CLAUDE.md that imports AGENTS.md rather than a second copy of it. Claude Code
    // ignores AGENTS.md whenever a CLAUDE.md sits beside it, so this file is what makes
    // the shared one reach Claude at all, and it also covers sessions where reading
    // AGENTS.md directly is unavailable.
    host.fs.copy(host.templatePath('_agent-instructions/CLAUDE.md'), host.destinationPath(CLAUDE_IMPORT_FILE));

    host.fs.copy(
        host.templatePath('_agent-instructions/skills/**'),
        host.destinationPath(skillDirectories[answers.skills]),
    );

    // The fetch script reads its base URL from the instruction file, and plans/ is
    // where the planning skills write blueprints. Neither is usable without the
    // instruction file, so both travel with it.
    host.fs.copy(host.templatePath('_agent-instructions/scripts/**'), host.destinationPath(SCRIPTS_DIR));

    host.fs.copy(host.templatePath('_agent-instructions/plans/**'), host.destinationPath(PLANS_DIR), {
        globOptions: { dot: true },
    });
}

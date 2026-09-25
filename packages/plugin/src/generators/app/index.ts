// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import chalk from 'chalk';
import validatePackageName from 'validate-npm-package-name';
import Generator from 'yeoman-generator';

// The instructions are one file for everyone; the skills are not, and cannot be.
//
// AGENTS.md is the cross-tool standard stewarded by the Agentic AI Foundation, read by
// Codex, Cursor, Copilot's coding agent, Gemini CLI and around twenty other tools. Claude
// Code reads it too, but only when no CLAUDE.md sits beside it, and not at all in sessions
// where that support is unavailable. So every scaffold gets AGENTS.md plus a CLAUDE.md
// holding a single `@AGENTS.md` import. That is Anthropic's documented way to share one
// file, and it keeps working wherever reading AGENTS.md directly does not.
//
// Skills are the part that stays split. Claude Code discovers them only under
// .claude/skills and reads nothing under .agents/, while .agents/skills is the cross-tool
// convention Codex, Cursor and Copilot settled on. No single directory serves both.
// Symlinking one at the other would, but Git checks symlinks out as plain text files on
// Windows without extra setup, which would leave those clones with no skills at all. So
// the developer picks, and that choice decides only where the skills land.
type AgentInstructions = 'claude' | 'agents' | 'none';

type Answers = {
    projectName: string;
    dirName: string;
    agentInstructions: AgentInstructions;
    environmentUrl: string;
};

const INSTRUCTION_FILE = 'AGENTS.md';
const CLAUDE_IMPORT_FILE = 'CLAUDE.md';

const skillDirectories: Record<Exclude<AgentInstructions, 'none'>, string> = {
    claude: '.claude/skills',
    agents: '.agents/skills',
};

export default class AppGenerator extends Generator {
    answers: Answers | undefined;

    async prompting() {
        const prompts: Generator.Questions = [
            {
                type: 'input',
                name: 'projectName',
                message: 'Enter project name:',
                validate: (name: string) => {
                    const result = validatePackageName(name);

                    if (result.validForNewPackages) {
                        return true;
                    }

                    return result.errors?.[0] ?? result.warnings?.[0] ?? 'invalid name';
                },
            },
            {
                type: 'input',
                name: 'dirName',
                message: 'Enter project directory:',
                default: (responses: Partial<Answers>) => responses.projectName?.split('/').pop() ?? '',
            },
            {
                // Every choice but 'none' writes the same AGENTS.md and CLAUDE.md. This
                // only picks where the skills go, because skill discovery differs by tool.
                type: 'list',
                name: 'agentInstructions',
                message: 'Add AI coding instructions? (choose where skills should go)',
                default: 'claude',
                choices: [
                    { name: 'Claude Code — skills in .claude/skills (recommended)', value: 'claude' },
                    { name: 'Codex, Cursor, Copilot and others — skills in .agents/skills', value: 'agents' },
                    { name: 'No AI instructions', value: 'none' },
                ],
            },
            {
                type: 'input',
                name: 'environmentUrl',
                message: 'Evoke environment base URL (optional, set later in instruction file):',
                default: '',
                when: (responses: Partial<Answers>) => responses.agentInstructions !== 'none',
                filter: (value: string) => value.trim().replace(/\/+$/, ''),
                validate: (value: string) => {
                    if (!value) return true;
                    if (/^https?:\/\//.test(value)) return true;
                    return 'URL must start with https:// or http://';
                },
            },
        ];

        this.answers = await this.prompt<Answers>(prompts);
    }

    writing() {
        if (!this.answers) {
            throw new Error('no answers collected');
        }

        this.destinationRoot(this.answers.dirName);
        this.env.cwd = this.answers.dirName;

        this.fs.copyTpl(this.templatePath('**'), this.destinationPath(), this.answers, undefined, {
            globOptions: { dot: true, ignore: ['**/_agent-instructions/**'] },
        });

        this._copyAgentInstructions(this.answers);
    }

    _copyAgentInstructions(answers: Answers) {
        const choice = answers.agentInstructions;

        if (choice === 'none') {
            return;
        }

        this.fs.copyTpl(
            this.templatePath('_agent-instructions/INSTRUCTIONS.md'),
            this.destinationPath(INSTRUCTION_FILE),
            answers,
        );

        // A CLAUDE.md that imports AGENTS.md rather than a second copy of it. Claude Code
        // ignores AGENTS.md whenever a CLAUDE.md sits beside it, so this file is what makes
        // the shared one reach Claude at all, and it also covers sessions where reading
        // AGENTS.md directly is unavailable.
        this.fs.copy(this.templatePath('_agent-instructions/CLAUDE.md'), this.destinationPath(CLAUDE_IMPORT_FILE));

        this.fs.copy(
            this.templatePath('_agent-instructions/skills/**'),
            this.destinationPath(skillDirectories[choice]),
        );

        // The fetch script reads its base URL from the instruction file, and plans/ is
        // where the planning skills write blueprints. Neither is usable without an
        // agent choice, so both stay out of a 'none' scaffold.
        this.fs.copy(this.templatePath('_agent-instructions/scripts/**'), this.destinationPath('scripts'));

        this.fs.copy(this.templatePath('_agent-instructions/plans/**'), this.destinationPath('plans'), {
            globOptions: { dot: true },
        });
    }

    end() {
        if (!this.answers) {
            throw new Error('no answers collected');
        }

        const prompt = chalk.cyan('     > ');

        this.log.writeln();
        this.log.ok('Plugin generated successfully!');
        this.log.writeln();
        this.log.writeln('The generated plugin contains a sample widget. You can create a');
        this.log.writeln('deployable package by typing:');
        this.log.writeln();
        this.log.write(prompt).writeln(`cd ${this.answers.dirName}`);
        this.log.write(prompt).writeln('npm run package');
        this.log.writeln();

        const choice = this.answers.agentInstructions;

        if (choice !== 'none') {
            this.log.writeln(
                `AI coding instructions added: ${INSTRUCTION_FILE}, a ${CLAUDE_IMPORT_FILE} that imports it, and skills under ${skillDirectories[choice]}/.`,
            );

            if (this.answers.environmentUrl) {
                this.log.writeln(
                    `Environment URL: ${this.answers.environmentUrl}. Run 'bash scripts/fetch-openapi-specs.sh' to download API specs.`,
                );
            } else {
                this.log.writeln(
                    `Set your environment URL in ${INSTRUCTION_FILE} then run 'bash scripts/fetch-openapi-specs.sh'.`,
                );
            }

            this.log.writeln();
        }
    }
}

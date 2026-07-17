// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import chalk from 'chalk';
import validatePackageName from 'validate-npm-package-name';
import Generator from 'yeoman-generator';

type AgentInstructions = 'claude' | 'codex' | 'generic' | 'none';

type Answers = {
    projectName: string;
    dirName: string;
    agentInstructions: AgentInstructions;
    environmentUrl: string;
};

const instructionFileNames: Record<Exclude<AgentInstructions, 'none'>, string> = {
    claude: 'CLAUDE.md',
    codex: 'AGENTS.md',
    generic: 'INSTRUCTIONS.md',
};

const skillDirectories: Record<Exclude<AgentInstructions, 'none'>, string> = {
    claude: '.claude/skills',
    codex: '.agents/skills',
    generic: '.agents/skills',
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
                type: 'list',
                name: 'agentInstructions',
                message: 'Add AI coding instructions?',
                default: 'claude',
                choices: [
                    { name: 'Claude Code (recommended)', value: 'claude' },
                    { name: 'Codex', value: 'codex' },
                    { name: 'Generic instructions only', value: 'generic' },
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
            this.destinationPath(instructionFileNames[choice]),
            answers,
        );

        this.fs.copy(
            this.templatePath('_agent-instructions/skills/**'),
            this.destinationPath(skillDirectories[choice]),
        );
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
                `AI coding instructions added: ${instructionFileNames[choice]} and skills under ${skillDirectories[choice]}/.`,
            );

            if (this.answers.environmentUrl) {
                this.log.writeln(
                    `Environment URL: ${this.answers.environmentUrl}. Run 'bash scripts/fetch-openapi-specs.sh' to download API specs.`,
                );
            } else {
                this.log.writeln(
                    `Set your environment URL in ${instructionFileNames[choice]} then run 'bash scripts/fetch-openapi-specs.sh'.`,
                );
            }

            this.log.writeln();
        }
    }
}

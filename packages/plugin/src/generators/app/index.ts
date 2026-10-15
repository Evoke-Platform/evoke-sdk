// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import chalk from 'chalk';
import validatePackageName from 'validate-npm-package-name';
import Generator from 'yeoman-generator';
import {
    CLAUDE_IMPORT_FILE,
    INSTRUCTION_FILE,
    SKILL_LOCATION_CHOICES,
    SkillLocation,
    normalizeEnvironmentUrl,
    skillDirectories,
    validateEnvironmentUrl,
    writePluginAgentFiles,
} from '../../lib/plugin-agent';

// See src/lib/plugin-agent.ts for why instructions are one file and skills are a choice.
type AgentInstructions = SkillLocation | 'none';

type Answers = {
    projectName: string;
    dirName: string;
    agentInstructions: AgentInstructions;
    environmentUrl: string;
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
                message: 'Add the Plugin Agent (beta)? AI coding instructions and skills for building Evoke plugins.',
                default: 'claude',
                choices: [
                    ...SKILL_LOCATION_CHOICES.map((choice) => ({
                        name: `Yes, for ${choice.name}`,
                        value: choice.value,
                    })),
                    { name: 'No', value: 'none' },
                ],
            },
            {
                type: 'input',
                name: 'environmentUrl',
                message: 'Evoke environment base URL (optional, set later in instruction file):',
                default: '',
                when: (responses: Partial<Answers>) => responses.agentInstructions !== 'none',
                filter: normalizeEnvironmentUrl,
                validate: validateEnvironmentUrl,
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
            globOptions: { dot: true, ignore: ['**/_agent-instructions/**', '**/gitignore'] },
        });

        // npm strips every file named .gitignore when it packs a package, so a template
        // stored under that name never reaches anyone who installs the generator from the
        // registry. It is stored as `gitignore` and renamed here instead.
        this.fs.copy(this.templatePath('gitignore'), this.destinationPath('.gitignore'));

        const choice = this.answers.agentInstructions;

        if (choice !== 'none') {
            writePluginAgentFiles(this, {
                projectName: this.answers.projectName,
                skills: choice,
                environmentUrl: this.answers.environmentUrl,
            });
        }
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
                `Plugin Agent (beta) added: ${INSTRUCTION_FILE}, a ${CLAUDE_IMPORT_FILE} that imports it, and skills under ${skillDirectories[choice]}/.`,
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

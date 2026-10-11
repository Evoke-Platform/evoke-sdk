// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import path from 'path';
import Generator from 'yeoman-generator';
import { detectPluginProject, PackageJson } from '../../lib/detect';
import { mergeGitignore } from '../../lib/gitignore';
import {
    CLAUDE_IMPORT_FILE,
    INSTRUCTION_FILE,
    PluginAgentAnswers,
    SKILL_LOCATION_CHOICES,
    SkillLocation,
    isSkillLocation,
    normalizeEnvironmentUrl,
    skillDirectories,
    validateEnvironmentUrl,
    writePluginAgentFiles,
} from '../../lib/plugin-agent';
import {
    DEFAULT_STORYBOOK_PORT,
    formatTestToolingReport,
    inspectTestTooling,
    planPackageJsonAdditions,
    POSTINSTALL_MARKER,
    SCAFFOLD_STORYBOOK_MAJOR,
    storybookMajorOf,
    storybookManualEdits,
    storybookPortOf,
    TEST_TOOLING_FILES,
    TestToolingReport,
} from '../../lib/test-tooling';

// Yeoman's constructor calls determineAppname(), which reads package.json as JSON and throws a
// stack-carrying error on a broken file before initializing() can report it. A broken package.json
// must reach detectPluginProject, and nothing here reads this.appname, so skip the read. It lives
// on a base class because Yeoman queues a generator's own public prototype methods as run-loop
// tasks (getTaskNames), and inherited ones are not enumerated.
class ExistingProjectGenerator extends Generator {
    determineAppname() {
        return path.basename(this.destinationRoot());
    }
}

export class UsageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UsageError';
    }
}

type Options = {
    skills?: string;
    'env-url'?: string;
    'add-test-tooling'?: boolean;
};

// Adds the Plugin Agent to a plugin project that already exists in the current directory.
// It writes the same five items the new-project scaffold writes, merges .gitignore, and
// offers the Storybook test tooling the instructions assume. Everything else in the
// project is left alone.
export default class AddPluginAgentGenerator extends ExistingProjectGenerator {
    projectName = '';
    projectPkg: PackageJson = {};
    templatePkg: PackageJson = {};
    answers: PluginAgentAnswers | undefined;
    report: TestToolingReport = { items: [], complete: true };
    addTestTooling = false;
    newerStorybookMajor: number | undefined;
    keptOwnHandlers = false;
    addedTestStorybookScript = false;

    constructor(args: string | string[], options: Generator.GeneratorOptions) {
        super(args, options);

        // One copy of the templates, owned by the app generator.
        this.sourceRoot(path.join(__dirname, '../app/templates'));

        this.option('skills', {
            type: String,
            description: "Skill folder: 'claude' (.claude/skills) or 'agents' (.agents/skills)",
        });
        this.option('env-url', {
            type: String,
            description: 'Evoke environment base URL written into AGENTS.md (empty allowed)',
        });
        this.option('add-test-tooling', {
            type: Boolean,
            description: 'Add missing Storybook test tooling without asking; --no-add-test-tooling skips it',
        });
    }

    initializing() {
        const opts = this.options as Options;

        if (opts.skills !== undefined && !isSkillLocation(opts.skills)) {
            throw new UsageError(`--skills must be 'claude' or 'agents', got '${opts.skills}'.`);
        }

        if (opts['env-url'] !== undefined) {
            const problem = validateEnvironmentUrl(normalizeEnvironmentUrl(opts['env-url']));

            if (problem !== true) {
                throw new UsageError(`--env-url: ${problem}`);
            }
        }

        // Read through this.fs so the file joins the in-memory store Yeoman commits from.
        const pkgPath = this.destinationPath('package.json');
        const raw = this.fs.exists(pkgPath) ? this.fs.read(pkgPath) : undefined;
        const detected = detectPluginProject(raw, this.destinationRoot());

        this.projectName = detected.projectName;
        this.projectPkg = detected.pkg;
        this.templatePkg = JSON.parse(this.fs.read(this.templatePath('package.json'))) as PackageJson;
    }

    async prompting() {
        const opts = this.options as Options;

        const prompted = await this.prompt<{ skills?: SkillLocation; environmentUrl?: string }>([
            {
                type: 'list',
                name: 'skills',
                message: 'Which tool runs the Plugin Agent (beta)? This only decides where the skills go.',
                default: 'claude',
                choices: SKILL_LOCATION_CHOICES,
                when: opts.skills === undefined,
            },
            {
                type: 'input',
                name: 'environmentUrl',
                message: `Evoke environment base URL (optional, set later in ${INSTRUCTION_FILE}):`,
                default: '',
                filter: normalizeEnvironmentUrl,
                validate: validateEnvironmentUrl,
                when: opts['env-url'] === undefined,
            },
        ]);

        this.answers = {
            projectName: this.projectName,
            skills: isSkillLocation(opts.skills) ? opts.skills : prompted.skills ?? 'claude',
            environmentUrl:
                opts['env-url'] !== undefined
                    ? normalizeEnvironmentUrl(opts['env-url'])
                    : prompted.environmentUrl ?? '',
        };

        this.report = inspectTestTooling(this.projectPkg, (file) => this.fs.exists(this.destinationPath(file)));

        // The tooling is Storybook 7 packages and would break a newer Storybook, so the
        // question is never asked and --add-test-tooling is ignored.
        const major = storybookMajorOf(this.projectPkg);

        if (major !== undefined && major > SCAFFOLD_STORYBOOK_MAJOR) {
            this.newerStorybookMajor = major;
            this.addTestTooling = false;

            return;
        }

        if (this.report.complete) {
            return;
        }

        if (opts['add-test-tooling'] !== undefined) {
            this.addTestTooling = opts['add-test-tooling'];

            return;
        }

        this.log.writeln();
        this.log.writeln('The Plugin Agent expects Storybook interaction tests and `npm run test-storybook`.');
        this.log.writeln('This project is missing some of that tooling:');

        for (const line of formatTestToolingReport(this.report)) {
            this.log.writeln(line);
        }

        this.log.writeln();

        const { addTestTooling } = await this.prompt<{ addTestTooling: boolean }>({
            type: 'confirm',
            name: 'addTestTooling',
            message:
                'Add the Storybook test tooling now? (adds the missing package.json keys and two files, then runs install)',
            default: false,
        });

        this.addTestTooling = addTestTooling;
    }

    writing() {
        if (!this.answers) {
            throw new Error('no answers collected');
        }

        writePluginAgentFiles(this, this.answers);

        const gitignorePath = this.destinationPath('.gitignore');
        const existing = this.fs.exists(gitignorePath) ? this.fs.read(gitignorePath) : undefined;
        const merged = mergeGitignore(existing, this.fs.read(this.templatePath('gitignore')));

        if (merged !== existing) {
            this.fs.write(gitignorePath, merged);
            this._markAsMerge(gitignorePath);
        }

        if (this.addTestTooling) {
            this._writeTestTooling();
        }
    }

    // The generator only appends to this file, so there is nothing for the developer to
    // arbitrate. Mark it so Yeoman's conflict checker writes it without an overwrite prompt.
    _markAsMerge(filePath: string) {
        const store = (this.fs as unknown as { store: { get(p: string): { conflicter?: string } } }).store;

        store.get(filePath).conflicter = 'force';
    }

    _writeTestTooling() {
        const pkgPath = this.destinationPath('package.json');
        const additions = planPackageJsonAdditions(this.projectPkg, this.templatePkg);

        this.addedTestStorybookScript = additions.scripts?.['test-storybook'] !== undefined;
        this.keptOwnHandlers = this.fs.exists(this.destinationPath('src/mocks/evokeHandlers.ts'));

        if (Object.keys(additions).length > 0) {
            // Keep the project's own indentation so the diff is the added keys and nothing else.
            const indent = /^([ \t]+)"/m.exec(this.fs.read(pkgPath))?.[1] ?? 2;

            // Writing package.json is what makes Yeoman run the package manager install
            // when this generator finishes, the same way a fresh scaffold gets installed.
            this.fs.extendJSON(pkgPath, additions, undefined, indent);
            this._markAsMerge(pkgPath);
        }

        // src/mocks/evokeHandlers.ts is the project's own MSW handlers once it exists, so a tooling
        // file is only ever created, never replaced, whatever --force or the conflict prompt says.
        for (const file of TEST_TOOLING_FILES) {
            if (!this.fs.exists(this.destinationPath(file))) {
                this.fs.copy(this.templatePath(file), this.destinationPath(file));
            }
        }
    }

    end() {
        if (!this.answers) {
            throw new Error('no answers collected');
        }

        this.log.writeln();
        this.log.ok(`Plugin Agent (beta) added to ${this.answers.projectName}.`);
        this.log.writeln(
            `${INSTRUCTION_FILE}, a ${CLAUDE_IMPORT_FILE} that imports it, skills under ${skillDirectories[this.answers.skills]}/, scripts/fetch-openapi-specs.sh and plans/. Files that already matched were left as they were.`,
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

        if (this.newerStorybookMajor !== undefined) {
            this.log.writeln();

            if (this.report.complete) {
                this.log.writeln(
                    `This project uses Storybook ${this.newerStorybookMajor} and already has the test tooling. The agent files were added. The existing test tooling was left as it is.`,
                );
            } else {
                this.log.writeln(
                    `This project uses Storybook ${this.newerStorybookMajor}. The Plugin Agent's test tooling and instructions target Storybook ${SCAFFOLD_STORYBOOK_MAJOR}, so the tooling was not added: its Storybook ${SCAFFOLD_STORYBOOK_MAJOR} packages would break this project's Storybook.`,
                );
                this.log.writeln(
                    `The agent files were added. Interaction tests and npm run test-storybook need setting up for Storybook ${this.newerStorybookMajor} by hand.`,
                );

                if ((this.options as Options)['add-test-tooling'] === true) {
                    this.log.writeln('--add-test-tooling was ignored for this reason.');
                }
            }
        } else if (!this.report.complete) {
            this.log.writeln();

            if (this.addTestTooling) {
                this.log.writeln(
                    'Storybook test tooling added. Two files are yours to edit, because every project customizes them:',
                );
                this.log.writeln(storybookManualEdits(this.keptOwnHandlers));

                const port = storybookPortOf(this.projectPkg);

                if (port !== DEFAULT_STORYBOOK_PORT && this.addedTestStorybookScript) {
                    this.log.writeln(
                        `This project runs Storybook on port ${port}, so test-storybook was set to the same port. The Plugin Agent instructions read the port from package.json.`,
                    );
                }

                const postinstall = this.projectPkg.scripts?.postinstall;

                if (postinstall && !postinstall.includes(POSTINSTALL_MARKER)) {
                    this.log.writeln(
                        `Your existing postinstall script was left alone. Append to it:  && ${this.templatePkg.scripts?.postinstall}`,
                    );
                }
            } else {
                this.log.writeln('Storybook test tooling was not added. Missing:');

                for (const line of formatTestToolingReport(this.report).filter((line) => line.startsWith('  [ ]'))) {
                    this.log.writeln(line);
                }

                this.log.writeln(
                    'The instructions reference `npm run test-storybook`, which this project does not have yet. Re-run with --add-test-tooling to add it.',
                );
            }
        }

        this.log.writeln();
    }
}

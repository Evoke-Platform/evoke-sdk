// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import fs from 'fs';
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
    importsAgentsFile,
    isSkillLocation,
    normalizeEnvironmentUrl,
    skillDirectories,
    validateEnvironmentUrl,
    writePluginAgentFiles,
} from '../../lib/plugin-agent';
import {
    DEFAULT_STORYBOOK_PORT,
    formatTestToolingReport,
    hasToolingToAdd,
    inspectTestTooling,
    MSW_WORKER_DIRECTORY,
    planPackageJsonAdditions,
    POSTINSTALL_MARKER,
    mergePackageJson,
    mswVersionOf,
    SCAFFOLD_MSW_MAJOR,
    SCAFFOLD_STORYBOOK_MAJOR,
    storybookVersionOf,
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
    // Set by bin/create-plugin.js from whether a terminal is attached. Only an explicit false means
    // there is none, so a run that does not set it (yeoman-test, another host) keeps prompting.
    interactive?: boolean;
    force?: boolean;
};

// The part of a mem-fs file the conflict check reads.
type QueuedFile = {
    path: string;
    state?: string;
    conflicter?: string;
    contents: Buffer | null;
    stat?: { mode?: number } | null;
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
    // The Storybook major the project is on when it is not the one the tooling targets, older or newer.
    otherStorybookMajor: number | undefined;
    // Why the tooling was not offered when the project's Storybook or MSW cannot take it.
    toolingBlockedBy: string | undefined;
    // Something is missing, but only in a place this command never edits (a postinstall the
    // project wrote itself), so there is nothing it could add.
    nothingToAdd = false;
    keptOwnHandlers = false;
    addedTestStorybookScript = false;
    // No terminal, and nothing said whether to add the tooling: it was answered no.
    toolingQuestionSkipped = false;

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

        // Nothing has been written yet, so this stops the run cleanly.
        if (this._noTerminal() && opts.skills === undefined) {
            throw new UsageError(
                'No terminal is attached, so add-plugin-agent cannot ask which tool runs the agent. Pass --skills claude or --skills agents.',
            );
        }
    }

    // Without a terminal a prompt cannot be answered: it crashes on the closed stdin, and by then
    // Yeoman has written the files it checked before the one it asked about.
    _noTerminal(): boolean {
        return (this.options as Options).interactive === false;
    }

    async prompting() {
        const opts = this.options as Options;

        // Without a terminal nothing is asked: --skills was checked in initializing(), and a missing
        // --env-url is an empty one, the same as an empty answer.
        let prompted: { skills?: SkillLocation; environmentUrl?: string } = {};

        if (!this._noTerminal()) {
            prompted = await this.prompt<{ skills?: SkillLocation; environmentUrl?: string }>([
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
        }

        this.answers = {
            projectName: this.projectName,
            skills: isSkillLocation(opts.skills) ? opts.skills : prompted.skills ?? 'claude',
            environmentUrl:
                opts['env-url'] !== undefined
                    ? normalizeEnvironmentUrl(opts['env-url'])
                    : prompted.environmentUrl ?? '',
        };

        this.report = inspectTestTooling(this.projectPkg, (file) => this.fs.exists(this.destinationPath(file)));

        // The tooling is Storybook 7 packages and would break any other Storybook, older or newer,
        // so the question is never asked and --add-test-tooling is ignored.
        const storybook = storybookVersionOf(this.projectPkg);

        if (storybook.kind === 'major' && storybook.major !== SCAFFOLD_STORYBOOK_MAJOR) {
            this.otherStorybookMajor = storybook.major;
            this.addTestTooling = false;

            return;
        }

        // A declared version that cannot be read could be Storybook 6, 8 or 9, so it is treated
        // like another major. The same goes for an MSW the handlers file cannot compile against.
        const msw = mswVersionOf(this.projectPkg);

        if (storybook.kind === 'absent') {
            this.toolingBlockedBy = 'This project has no Storybook, so the Storybook test tooling was not added.';
        } else if (storybook.kind === 'unknown') {
            this.toolingBlockedBy = `This project declares Storybook as "${storybook.spec}", so its version cannot be checked. The Plugin Agent's test tooling targets Storybook ${SCAFFOLD_STORYBOOK_MAJOR}, so it was not added.`;
        } else if (msw.kind === 'major' && msw.major < SCAFFOLD_MSW_MAJOR) {
            this.toolingBlockedBy = `This project uses MSW ${msw.major}. The Plugin Agent's mock handlers and Storybook addon need MSW ${SCAFFOLD_MSW_MAJOR}, so the test tooling was not added.`;
        } else if (msw.kind === 'unknown') {
            this.toolingBlockedBy = `This project declares MSW as "${msw.spec}", so its version cannot be checked. The Plugin Agent's mock handlers and Storybook addon need MSW ${SCAFFOLD_MSW_MAJOR}, so the test tooling was not added.`;
        }

        if (this.toolingBlockedBy !== undefined) {
            this.addTestTooling = false;

            return;
        }

        if (this.report.complete) {
            return;
        }

        const fileExists = (file: string) => this.fs.exists(this.destinationPath(file));

        if (!hasToolingToAdd(this.projectPkg, this.templatePkg, fileExists)) {
            this.nothingToAdd = true;
            this.addTestTooling = false;

            return;
        }

        if (opts['add-test-tooling'] !== undefined) {
            this.addTestTooling = opts['add-test-tooling'];

            return;
        }

        // The safe answer: it leaves the project's package.json alone. end() says so.
        if (this._noTerminal()) {
            this.addTestTooling = false;
            this.toolingQuestionSkipped = true;

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

        // Everything is still in memory here: Yeoman writes to disk, and asks about each file that
        // differs, only after this phase. Stopping now leaves the project exactly as it was.
        if (this._noTerminal() && !(this.options as Options).force) {
            const conflicts = this._filesNeedingAnAnswer();

            if (conflicts.length > 0) {
                throw new UsageError(
                    `No terminal is attached, so add-plugin-agent cannot ask before replacing these files: ${conflicts.join(', ')}. Run it in a terminal to choose for each file, or pass --force to replace them.`,
                );
            }
        }
    }

    // The files Yeoman would stop to ask about, by its own test (the conflicter's _detectConflict):
    // a file that is on disk and is a directory, differs in content, or differs in mode. A file marked
    // as a merge is written without a question, and one that is not on disk is simply created.
    _filesNeedingAnAnswer(): string[] {
        const store = (this.fs as unknown as { store: { all(): QueuedFile[] } }).store;
        const root = this.destinationRoot();
        const found: string[] = [];

        for (const file of store.all()) {
            if (file.state !== 'modified' || file.conflicter) {
                continue;
            }

            let onDisk: fs.Stats;

            try {
                onDisk = fs.statSync(file.path);
            } catch {
                continue;
            }

            const differs =
                onDisk.isDirectory() ||
                Boolean(file.stat?.mode && file.stat.mode !== onDisk.mode) ||
                !fs.readFileSync(file.path).equals(file.contents ?? Buffer.alloc(0));

            if (differs) {
                found.push(path.relative(root, file.path).split(path.sep).join('/'));
            }
        }

        return found.sort();
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
            // Writing package.json is what makes Yeoman run the package manager install
            // when this generator finishes, the same way a fresh scaffold gets installed.
            this.fs.write(pkgPath, mergePackageJson(this.fs.read(pkgPath), additions));
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

    // The postinstall script is the one tooling piece this command never edits.
    _logPostinstallHint() {
        const postinstall = this.projectPkg.scripts?.postinstall;

        if (postinstall && !postinstall.includes(POSTINSTALL_MARKER)) {
            this.log.writeln(
                `Your existing postinstall script was left alone. Append to it:  && ${this.templatePkg.scripts?.postinstall}`,
            );
            // Nothing this command ran executes the new postinstall, so the browser and the MSW
            // worker file test-storybook needs may not exist yet.
            this.log.writeln(
                `Until then, run these once so test-storybook can start:  npx playwright install chromium && npx msw init ${MSW_WORKER_DIRECTORY}`,
            );
        }
    }

    // What the developer ends up with is the CLAUDE.md on disk. Answering "skip" at the overwrite
    // prompt leaves Yeoman's in-memory copy holding the new import, so the file is read directly.
    // A file that cannot be read is not reported on, so this message cannot fail a finished run.
    _claudeMdLacksImport(): boolean {
        try {
            return !importsAgentsFile(fs.readFileSync(this.destinationPath(CLAUDE_IMPORT_FILE), 'utf8'));
        } catch {
            return false;
        }
    }

    end() {
        if (!this.answers) {
            throw new Error('no answers collected');
        }

        this.log.writeln();
        this.log.ok(`Plugin Agent (beta) added to ${this.answers.projectName}.`);

        if (this._claudeMdLacksImport()) {
            // The developer kept their own CLAUDE.md, and without the import Claude Code never reads AGENTS.md.
            this.log.writeln(
                `${INSTRUCTION_FILE}, skills under ${skillDirectories[this.answers.skills]}/, scripts/fetch-openapi-specs.sh and plans/. The project's own ${CLAUDE_IMPORT_FILE} was kept. Files that already matched were left as they were.`,
            );
            this.log.writeln(
                `Your ${CLAUDE_IMPORT_FILE} does not import ${INSTRUCTION_FILE}, so Claude Code will not read the new instructions. Add this line to it: @${INSTRUCTION_FILE}`,
            );
        } else {
            this.log.writeln(
                `${INSTRUCTION_FILE}, a ${CLAUDE_IMPORT_FILE} that imports it, skills under ${skillDirectories[this.answers.skills]}/, scripts/fetch-openapi-specs.sh and plans/. Files that already matched were left as they were.`,
            );
        }

        if (this.answers.environmentUrl) {
            this.log.writeln(
                `Environment URL: ${this.answers.environmentUrl}. Run 'bash scripts/fetch-openapi-specs.sh' to download API specs.`,
            );
        } else {
            this.log.writeln(
                `Set your environment URL in ${INSTRUCTION_FILE} then run 'bash scripts/fetch-openapi-specs.sh'.`,
            );
        }

        if (this.otherStorybookMajor !== undefined) {
            this.log.writeln();

            if (this.report.complete) {
                this.log.writeln(
                    `This project uses Storybook ${this.otherStorybookMajor} and already has the test tooling. The agent files were added. The existing test tooling was left as it is.`,
                );
            } else {
                this.log.writeln(
                    `This project uses Storybook ${this.otherStorybookMajor}. The Plugin Agent's test tooling and instructions target Storybook ${SCAFFOLD_STORYBOOK_MAJOR}, so the tooling was not added: its Storybook ${SCAFFOLD_STORYBOOK_MAJOR} packages would break this project's Storybook.`,
                );
                this.log.writeln(
                    `The agent files were added. Interaction tests and npm run test-storybook need setting up for Storybook ${this.otherStorybookMajor} by hand.`,
                );

                if ((this.options as Options)['add-test-tooling'] === true) {
                    this.log.writeln('--add-test-tooling was ignored for this reason.');
                }
            }
        } else if (this.toolingBlockedBy !== undefined) {
            if (!this.report.complete) {
                this.log.writeln();
                this.log.writeln(this.toolingBlockedBy);
                this.log.writeln(
                    'The agent files were added. Interaction tests and npm run test-storybook need setting up by hand.',
                );

                if ((this.options as Options)['add-test-tooling'] === true) {
                    this.log.writeln('--add-test-tooling was ignored for this reason.');
                }
            }
        } else if (this.nothingToAdd) {
            this.log.writeln();
            this._logPostinstallHint();
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

                this._logPostinstallHint();
            } else {
                this.log.writeln('Storybook test tooling was not added. Missing:');

                for (const line of formatTestToolingReport(this.report).filter((line) => line.startsWith('  [ ]'))) {
                    this.log.writeln(line);
                }

                const reference =
                    'The instructions reference `npm run test-storybook`, which this project does not have yet.';

                if (this.toolingQuestionSkipped) {
                    this.log.writeln(reference);
                    this.log.writeln(
                        'No terminal is attached, so the tooling question was answered no. Pass --add-test-tooling to add it.',
                    );
                } else {
                    this.log.writeln(`${reference} Re-run with --add-test-tooling to add it.`);
                }
            }
        }

        this.log.writeln();
    }
}

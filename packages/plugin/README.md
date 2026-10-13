# Evoke Plugin Generator

[![CodeQL Status](https://github.com/Evoke-Platform/evoke-sdk/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Evoke-Platform/evoke-sdk/actions/workflows/github-code-scanning/codeql)

Scaffold an Evoke platform plugin project.

## Getting Started

Run the generator with the following:

```sh
npx @evoke-platform/plugin
```

The generator will prompt you for a project name and a directory name. The project name must adhere to npm
package [naming conventions][package-name].

The scaffolded project includes a sample widget. Generate a deployable zip with:

```sh
cd plugindir
npm run package
```

A deployable zip will be created in the `target/` directory under the project root, which can be uploaded to
an Evoke environment.

### Plugin Agent (beta)

The generator can optionally add the Plugin Agent: AI coding instructions and skills for
building Evoke plugins. It is a beta feature and still evolving.

When prompted, choose:

-   **Yes, for Claude Code:** eleven skills under `.claude/skills/`.
-   **Yes, for Codex, Cursor, Copilot and others:** eleven skills under `.agents/skills/`.
-   **No:** adds no agent files.

Either choice writes the same two files: `AGENTS.md` with the guidance, and a `CLAUDE.md`
containing a single `@AGENTS.md` import. `AGENTS.md` is the cross-tool convention read by
Codex, Cursor, Copilot's coding agent, Gemini CLI and many other tools. Claude Code reads
it too, but only when no `CLAUDE.md` sits beside it, so the import is what makes the shared
file reach Claude. There is one copy of the guidance, not two.

The choice only decides where the skills go, because skill discovery is the part that is
still split: Claude Code looks only in `.claude/skills/` and reads nothing under
`.agents/`, while `.agents/skills/` is the convention the other tools settled on.

The generated guidance covers project structure, commands, widget configuration, forms,
test-first Storybook development, criteria filters, correspondence sending, payment gateway safety, and guardrails.
The agent instructions are built around a feedback loop. Generated projects include
Storybook interaction tests and `npm run test-storybook`, which returns a plain pass or
fail. Without that, an agent is changing UI code blind, with no way to tell what actually
worked. The tests ship with every generated project regardless of the choice above.

### Add the Plugin Agent to an existing project

Projects scaffolded before the Plugin Agent existed can adopt it without starting over.
From the project root:

```sh
npx @evoke-platform/plugin add-plugin-agent
```

The command checks that the directory holds an Evoke plugin project (a `package.json`
that depends on `@evoke-platform/plugin-scripts` or `@evoke-platform/sdk`), takes the
project name from `package.json`, and asks the same two questions as the scaffold: which
tool will run the agent, which decides only where the skills go, and the optional
environment URL. It then writes `AGENTS.md`, `CLAUDE.md`, the eleven skills,
`scripts/fetch-openapi-specs.sh` and `plans/.gitkeep`, and appends any missing lines to
`.gitignore` under a comment header.

Nothing else in the project is touched. If a file already exists with different content,
for example a hand-written `CLAUDE.md`, you are asked whether to overwrite it, and can ask to
see the difference first. If you keep your own `CLAUDE.md`, add a line `@AGENTS.md` to it so
Claude Code reads `AGENTS.md`. `.gitignore` and `package.json` are the exception: the command only
ever adds lines or keys to them, so it writes them without asking. Running the command a second
time writes nothing.

The agent instructions assume Storybook interaction tests run by `npm run test-storybook`
with MSW standing in for the Evoke API. If the project lacks any of that, the command
lists what is missing and asks whether to add it. Answering yes adds only the missing
`package.json` entries plus `test-runner-jest.config.js` and `src/mocks/evokeHandlers.ts`,
then, if `package.json` gained anything, runs the project's package manager install. Two files
are left for you because every project customizes them, and the exact edits are printed: `.storybook/main.ts` needs the
`msw-storybook-addon` addon and `staticDirs: ['./public']`, and `.storybook/preview.ts` is renamed to `preview.tsx` and
needs the MSW `initialize()` call and `mswLoader`, a `MemoryRouter` decorator (SDK components call router hooks), and a
loader that calls `resetRequestLog()` before each story. Answering no changes nothing and the
instructions will reference a test command the project does not have yet.

Projects already on Storybook 8 or newer get the agent files but not the tooling, because the bundled tooling and instructions target Storybook 7. The same applies to a project with no Storybook at all, when the Storybook or MSW version cannot be read (for example `latest` or `workspace:*`), and when the project uses MSW 1, because the bundled mock handlers need MSW 2.

Options for scripts and non-interactive use:

| Option                                 | Effect                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `--skills claude` or `--skills agents` | Skill folder, instead of the prompt                            |
| `--env-url <url>`                      | Environment URL, instead of the prompt (empty string allowed)  |
| `--add-test-tooling`                   | Answer yes to the tooling question without asking              |
| `--no-add-test-tooling`                | Answer no to the tooling question without asking               |
| `-f`, `--force`                        | Overwrite conflicting files without asking                     |
| `--skip-install`                       | Add the tooling but skip the install; run npm install yourself |
| `-h`, `--help`                         | List these options                                             |

The plain `npx @evoke-platform/plugin` scaffold takes no options; it prompts for everything.

## License

[MIT](https://github.com/Evoke-Platform/evoke-sdk/blob/main/LICENSE)

[package-name]: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name

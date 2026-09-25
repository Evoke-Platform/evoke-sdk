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

### Agent Guidance

The generator can optionally scaffold AI coding instructions.

When prompted, choose:

-   **Claude Code (recommended):** eleven skills under `.claude/skills/`.
-   **Codex, Cursor, Copilot and others:** eleven skills under `.agents/skills/`.
-   **No AI instructions:** adds no agent files.

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

## License

[MIT](https://github.com/Evoke-Platform/evoke-sdk/blob/main/LICENSE)

[package-name]: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name

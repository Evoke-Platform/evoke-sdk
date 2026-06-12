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

-   **Claude Code (recommended):** adds `CLAUDE.md` and eight skills under `.claude/skills/`.
-   **Codex:** adds `AGENTS.md` and eight skills under `.agents/skills/`.
-   **Generic instructions only:** adds `INSTRUCTIONS.md` and eight skills under `.agents/skills/`
    (readable as plain documentation by tools without a skill mechanism).
-   **No AI instructions:** adds no agent files.

The generated guidance covers project structure, commands, widget configuration, forms,
test-first Storybook development, criteria filters, correspondence sending, payment gateway safety, and guardrails.
Generated projects include Storybook interaction testing with `npm run test-storybook` for a CLI pass/fail signal.

## License

[MIT](https://github.com/Evoke-Platform/evoke-sdk/blob/main/LICENSE)

[package-name]: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name

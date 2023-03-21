# Evoke Plugin Generator

Scaffold an Evoke platform plugin project.

## Getting Started

Run the generator with the following:

```sh
npx @evoke-platform/plugin
```

The generator will prompt you for a project name and a directory name. The project name must adhere to npm package [naming conventions][package-name].

The scaffolded project includes a sample widget. Generate a deployable zip with:

```sh
cd plugindir
npm run package
```

A deployable zip will be created in the `target/` directory under the project root, which can be uploaded to an Evoke environment.

## License

[MIT](../../LICENSE)

[package-name]: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name

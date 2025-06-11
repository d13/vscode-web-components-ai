# Contributing

Thank you for your interest in contributing to this project!

## Following extension guidelines

Please note the [Code of Conduct](CODE_OF_CONDUCT.md) document, please follow it in all your interactions with this project.

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Getting Started

### Prerequisites

- [NodeJS](https://nodejs.org/), `>= 20.18.3`
- [Corepack](https://nodejs.org/docs/latest-v22.x/api/corepack.html), `>= 0.31.0`
- [pnpm](https://pnpm.io/), `>= 10.10.0` (installs using corepack)

For those using [nvm](https://github.com/nvm-sh/nvm), simply run the following command to install the required version of NodeJS:

```
nvm use
```

> 👉 **NOTE!** Corepack version
>
> Check your version of corepack by running `corepack -v` and ensure it is at least `0.31.0`. To update corepack, run `npm install corepack@latest`. You can enable corepack by running `corepack enable`.

### Dependencies

To install the dependencies for this project, run the following command in the root directory:

```bash
pnpm install
```

### Build

From a terminal, where you have cloned the repository, execute the following command to build the project:

```bash
pnpm run build
```

### Watch

During development you can use a watcher to make builds on changes quick and easy. From a terminal, where you have cloned the repository, execute the following command:

```bash
pnpm run watch
```

### Running locally

To run the extension locally, you can use the `Watch & Run` launch configuration Run and Debug sidebar in Visual Studio Code. This will open a new instance of VS Code with your extension loaded.

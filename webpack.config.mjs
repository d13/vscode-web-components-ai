//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

import CopyPlugin from 'copy-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; skipLint?: boolean } | undefined } env
 * @param {{ mode: 'production' | 'development' | 'none' | undefined }} argv
 * @returns { WebpackConfig[] }
 */
export default function (env, argv) {
  const mode = argv.mode || 'none';

  env = {
    analyzeBundle: false,
    analyzeDeps: false,
    esbuild: true,
    skipLint: false,
    ...env,
  };

  return [
    getExtensionConfig('node', mode, env),
    // getWebviewsConfig(mode, env),
  ];
}

/**
 * @param { 'node' | 'webworker' } target
 * @param { 'production' | 'development' | 'none' } mode
 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; skipLint?: boolean }} env
 * @returns { WebpackConfig }
 */
function getExtensionConfig(target = 'node', mode = 'none', env) {
  const tsConfigPath = path.join(__dirname, 'tsconfig.node.json');

  /** @type WebpackConfig */
  const extensionConfig = {
    name: `extension:${target}`,
    target: target,
    mode: mode,
    devtool: mode === 'production' ? false : 'source-map',
    entry: './src/extension.ts',
    output: {
      chunkFilename: '[name].js',
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      path: path.resolve(__dirname, 'dist'),
    },
    externals: {
      vscode: 'commonjs vscode',
    },
    resolve: {
      alias: {
        '@env': path.join(__dirname, 'src', 'env', 'node'),
      },
      mainFields: ['module', 'main'],
      extensions: ['.ts', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: path.join(__dirname, 'src'),
          exclude: /\.d\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: tsConfigPath,
              },
            },
          ],
        },
      ],
    },
    infrastructureLogging:
      mode === 'production'
        ? undefined
        : {
            level: 'log', // enables logging required for problem matchers
          },
  };

  return extensionConfig;
}

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; skipLint?: boolean }} env
 * @returns { WebpackConfig }
 */
function getWebviewsConfig(mode = 'none', env) {
  const basePath = path.join(__dirname, 'src', 'webviews', 'apps');
  const tsConfigPath = path.join(basePath, 'tsconfig.json');

  /** @type WebpackConfig['plugins'] | any */
  const plugins = [
    new CopyPlugin({
      patterns: [
        {
          from: path.posix.join(
            __dirname.replace(/\\/g, '/'),
            'node_modules',
            '@vscode',
            'codicons',
            'dist',
            'codicon.ttf',
          ),
          to: path.posix.join(__dirname.replace(/\\/g, '/'), 'dist', 'webviews'),
        },
        {
          from: path.posix.join(basePath.replace(/\\/g, '/'), '*.css'),
          to: path.posix.join(__dirname.replace(/\\/g, '/'), 'dist', 'webviews'),
        },
      ],
    }),
  ];

  /** @type WebpackConfig */
  const webviewsConfig = {
    name: 'webviews',
    target: 'web',
    mode: mode,
    devtool: mode === 'production' ? false : 'source-map',
    context: basePath,
    entry: {
      // todos: './todos/index.ts',
    },
    output: {
      chunkFilename: '[name].js',
      filename: '[name].js',
      libraryTarget: 'module',
      path: path.join(__dirname, 'dist', 'webviews'),
      publicPath: '#{root}/dist/webviews/',
    },
    experiments: {
      outputModule: true,
    },
    resolve: {
      alias: {
        '@env': path.resolve(__dirname, 'src', 'env', 'browser'),
      },
      modules: [basePath, 'node_modules'],
      extensions: ['.ts', '.js', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.m?js/,
          resolve: { fullySpecified: false },
        },
        {
          test: /\.ts$/,
          include: path.join(__dirname, 'src'),
          exclude: /\.d\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: tsConfigPath,
              },
            },
          ],
        },
      ],
    },
    plugins,
    infrastructureLogging:
      mode === 'production'
        ? undefined
        : {
            level: 'log', // enables logging required for problem matchers
          },
  };

  return webviewsConfig;
}

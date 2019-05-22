const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const APP_DIR = path.resolve(__dirname, './ts');
const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');

const config = {
  entry: './ts/index.tsx',
  mode: 'development',
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['javascript']
    }),
    new CopyWebpackPlugin([
        { from: 'html' }
    ])
  ],
  output: {
    path: path.resolve('dist'),
    filename: 'js/[name].bundle.js'
  },
  resolve: {
    modules: ['./dist', './ts', 'node_modules'],
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      }
    ],
  },
  node: {
    'fs': 'empty',
    'child_process': 'empty',
    'net': 'empty',
    'module': 'empty'
  }
};

module.exports = config;
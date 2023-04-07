// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const manifest = require('./manifest.json');
const path = require('path');

const exposedWidgets = {};

for (const widget of manifest.widgets ?? []) {
    exposedWidgets[`./${widget.id}`] = `./${widget.src}`;
}

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        port: 3002,
    },
    output: {
        publicPath: 'auto',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: ['babel-loader'],
                exclude: /node_modules/,
            },
            {
                test: /\.tsx?$/,
                use: ['ts-loader'],
                exclude: /node_modules/,
            },
            {
                test: /\.(css|scss)$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(jpg|jpeg|png|gif|mp3|svg)$/,
                type: 'asset/resource',
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new ModuleFederationPlugin({
            name: '<%= projectName %>',
            filename: 'remoteEntry.js',
            library: {
                name: '<%= projectName %>',
                type: 'window',
            },
            exposes: exposedWidgets,
            shared: [
                {
                    react: { singleton: true, requiredVersion: '>=18' },
                    'react-dom': { singleton: true, requiredVersion: '>=18' },
                    '@evoke-platform/context': { singleton: true, requiredVersion: '*' },
                    '@evoke-platform/ui-components': { singleton: true, requiredVersion: '*' },
                },
            ],
        }),
    ],
};

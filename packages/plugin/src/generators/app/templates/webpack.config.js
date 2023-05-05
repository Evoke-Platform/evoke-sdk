const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const manifest = require('./dist/manifest.json');
const path = require('path');
const packageJson = require('./package.json');

const exposedWidgets = {};

for (const widget of manifest.widgets ?? []) {
    exposedWidgets[`./${widget.id}`] = `./${widget.src}`;
}

module.exports = {
    mode: 'development',
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
            name: packageJson.name,
            filename: 'remoteEntry.js',
            library: {
                name: packageJson.name,
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

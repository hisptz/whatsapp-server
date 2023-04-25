//@ts-nocheck
import path from "path";

const nodeExternals = require("webpack-node-externals")

module.exports = {
    mode: 'production',
    target: 'node',
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'app'),
    },
    optimization: {
        minimize: true,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    externals: [nodeExternals({
        additionalModuleDirs: [
            path.resolve(__dirname, '../../node_modules')
        ],
        modulesFromFile: true
    }),],
    externalsPresets: {
        node: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                },
            },

        ],
    },
};

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import { debug } from './logger';

export function readCompilerOptions() {
    const configFilePath = findConfigFile('./', sys.fileExists, 'tsconfig.json');

    if (!configFilePath) {
        throw new Error('Unable to find tsconfig.json');
    }

    debug('using config from %s', configFilePath);

    const configFile = readConfigFile(configFilePath, sys.readFile);

    if (configFile.error) {
        const msg =
            typeof configFile.error.messageText === 'string'
                ? configFile.error.messageText
                : configFile.error.messageText.messageText;

        throw new Error(`Error in tsconfig.json: ${msg}`);
    }

    const config = parseJsonConfigFileContent(configFile.config, sys, './');

    return config.options;
}

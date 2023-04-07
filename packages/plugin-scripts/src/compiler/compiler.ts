// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { glob } from 'glob';
import {
    CompilerOptions,
    createProgram,
    flattenDiagnosticMessageText,
    getLineAndCharacterOfPosition,
    getPreEmitDiagnostics,
} from 'typescript';
import { debug } from './logger';

export async function compile(options: CompilerOptions) {
    const rootDir = options.rootDir || 'src';

    debug('using root dir %s', rootDir);

    const files = await glob(`${rootDir}/**/*.{ts,tsx}`);

    debug('discovered %O', files);

    const program = createProgram({
        rootNames: files,
        options,
    });

    const result = program.emit();
    const diagnostics = getPreEmitDiagnostics(program).concat(result.diagnostics);

    for (const diagnostic of diagnostics) {
        let output: string;

        if (diagnostic.file && diagnostic.start) {
            const { line, character } = getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            const msg = flattenDiagnosticMessageText(diagnostic.messageText, '\n');

            output = `${diagnostic.file.fileName} (${line + 1}:${character + 1}): ${msg}`;
        } else {
            output = flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        }

        console.log(output);
    }

    if (result.emitSkipped) {
        throw new Error('Compilation errors');
    }
}

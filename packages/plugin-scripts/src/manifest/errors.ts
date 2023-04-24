// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { Node } from 'typescript';

export function locationString(compilerNode: Node) {
    const sourceFile = compilerNode.getSourceFile();
    const location = sourceFile.getLineAndCharacterOfPosition(compilerNode.pos);

    return `${sourceFile.fileName}(${location.line + 1},${location.character + 1})`;
}

export class SyntaxError extends Error {
    constructor(message: string, compilerNode: Node) {
        super(`${locationString(compilerNode)}: ${message}`);
    }
}

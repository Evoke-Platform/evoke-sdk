// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import * as tsdoc from '@microsoft/tsdoc';
import { Block, parse as parseComment } from 'comment-parser';
import ts, { SourceFile, SyntaxKind, TypeAliasDeclaration } from 'typescript';
import debug from './debug';

// Adapted from @microsoft/tsdoc api-demo
// https://github.com/microsoft/tsdoc/tree/main/api-demo

export interface Comment {
    compilerNode: ts.Node;
    commentBlock: Block;
}

export type ParsedSource = {
    sourceFile: SourceFile;
    comments: Comment[];
    types: {
        [key: string]: ts.TypeLiteralNode;
    };
};

/**
 * Returns true if the specified SyntaxKind is part of a declaration form.
 *
 * Based on ts.isDeclarationKind() from the compiler.
 * https://github.com/microsoft/TypeScript/blob/v3.0.3/src/compiler/utilities.ts#L6382
 */
function isDeclarationKind(kind: ts.SyntaxKind): boolean {
    return (
        kind === ts.SyntaxKind.ArrowFunction ||
        kind === ts.SyntaxKind.BindingElement ||
        kind === ts.SyntaxKind.ClassDeclaration ||
        kind === ts.SyntaxKind.ClassExpression ||
        kind === ts.SyntaxKind.Constructor ||
        kind === ts.SyntaxKind.EnumDeclaration ||
        kind === ts.SyntaxKind.EnumMember ||
        kind === ts.SyntaxKind.ExportSpecifier ||
        kind === ts.SyntaxKind.FunctionDeclaration ||
        kind === ts.SyntaxKind.FunctionExpression ||
        kind === ts.SyntaxKind.GetAccessor ||
        kind === ts.SyntaxKind.ImportClause ||
        kind === ts.SyntaxKind.ImportEqualsDeclaration ||
        kind === ts.SyntaxKind.ImportSpecifier ||
        kind === ts.SyntaxKind.InterfaceDeclaration ||
        kind === ts.SyntaxKind.JsxAttribute ||
        kind === ts.SyntaxKind.MethodDeclaration ||
        kind === ts.SyntaxKind.MethodSignature ||
        kind === ts.SyntaxKind.ModuleDeclaration ||
        kind === ts.SyntaxKind.NamespaceExportDeclaration ||
        kind === ts.SyntaxKind.NamespaceImport ||
        kind === ts.SyntaxKind.Parameter ||
        kind === ts.SyntaxKind.PropertyAssignment ||
        kind === ts.SyntaxKind.PropertyDeclaration ||
        kind === ts.SyntaxKind.PropertySignature ||
        kind === ts.SyntaxKind.SetAccessor ||
        kind === ts.SyntaxKind.ShorthandPropertyAssignment ||
        kind === ts.SyntaxKind.TypeAliasDeclaration ||
        kind === ts.SyntaxKind.TypeParameter ||
        kind === ts.SyntaxKind.VariableDeclaration ||
        kind === ts.SyntaxKind.JSDocTypedefTag ||
        kind === ts.SyntaxKind.JSDocCallbackTag ||
        kind === ts.SyntaxKind.JSDocPropertyTag
    );
}

/**
 * Retrieves the JSDoc-style comments associated with a specific AST node.
 *
 * Based on ts.getJSDocCommentRanges() from the compiler.
 * https://github.com/microsoft/TypeScript/blob/v3.0.3/src/compiler/utilities.ts#L924
 */
function getJSDocCommentRanges(node: ts.Node, text: string): ts.CommentRange[] {
    const commentRanges: ts.CommentRange[] = [];

    switch (node.kind) {
        case ts.SyntaxKind.Parameter:
        case ts.SyntaxKind.TypeParameter:
        case ts.SyntaxKind.FunctionExpression:
        case ts.SyntaxKind.ArrowFunction:
        case ts.SyntaxKind.ParenthesizedExpression:
            commentRanges.push(...(ts.getTrailingCommentRanges(text, node.pos) || []));
            break;
    }
    commentRanges.push(...(ts.getLeadingCommentRanges(text, node.pos) || []));

    // True if the comment starts with '/**' but not if it is '/**/'
    return commentRanges.filter(
        (comment) =>
            text.charCodeAt(comment.pos + 1) === 0x2a /* ts.CharacterCodes.asterisk */ &&
            text.charCodeAt(comment.pos + 2) === 0x2a /* ts.CharacterCodes.asterisk */ &&
            text.charCodeAt(comment.pos + 3) !== 0x2f /* ts.CharacterCodes.slash */,
    );
}

function walkCompilerAst(node: ts.Node, comments: Comment[], types: ParsedSource['types']): void {
    // The TypeScript AST doesn't store code comments directly.  If you want to find *every* comment,
    // you would need to rescan the SourceFile tokens similar to how tsutils.forEachComment() works:
    // https://github.com/ajafff/tsutils/blob/v3.0.0/util/util.ts#L453
    //
    // However, for this demo we are modeling a tool that discovers declarations and then analyzes their doc comments,
    // so we only care about TSDoc that would conventionally be associated with an interesting AST node.

    const buffer: string = node.getSourceFile().getFullText(); // don't use getText() here!

    // Only consider nodes that are part of a declaration form.  Without this, we could discover
    // the same comment twice (e.g. for a MethodDeclaration and its PublicKeyword).
    if (isDeclarationKind(node.kind)) {
        if (node.kind === SyntaxKind.TypeAliasDeclaration) {
            const typeAlias = node as TypeAliasDeclaration;

            if (typeAlias.type.kind === SyntaxKind.TypeLiteral) {
                debug('discovered type %s', typeAlias.name.text);

                types[typeAlias.name.text] = typeAlias.type as ts.TypeLiteralNode;
            } else {
                debug(
                    'could not determine definition for type %s from %s',
                    typeAlias.name.text,
                    ts.SyntaxKind[typeAlias.type.kind],
                );
            }
        }

        // Find "/** */" style comments associated with this node.
        // Note that this reinvokes the compiler's scanner -- the result is not cached.
        const commentRanges: ts.CommentRange[] = getJSDocCommentRanges(node, buffer);

        if (commentRanges.length > 0) {
            for (const commentRange of commentRanges) {
                const textRange = tsdoc.TextRange.fromStringRange(buffer, commentRange.pos, commentRange.end);
                const blocks = parseComment(textRange.toString());

                if (blocks.length) {
                    comments.push({
                        compilerNode: node,
                        commentBlock: blocks[0], // there should only be one block in textRange
                    });
                }
            }
        }
    }

    return node.forEachChild((child) => walkCompilerAst(child, comments, types));
}

export function parseFile(program: ts.Program, file: string): ParsedSource | undefined {
    debug('parsing file %s', file);

    // This appears to be necessary to initialize some program state.  Without
    // this the subsequent getSourceFile will fail.
    program.getSemanticDiagnostics();

    const sourceFile = program.getSourceFile(file);

    if (!sourceFile) {
        debug('unable to get source file %s', file);

        return undefined;
    }

    const comments: Comment[] = [];
    const types: ParsedSource['types'] = {};

    walkCompilerAst(sourceFile, comments, types);

    return {
        sourceFile,
        comments,
        types,
    };
}

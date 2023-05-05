// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { Spec } from 'comment-parser';
import {
    FunctionDeclaration,
    Program,
    PropertySignature,
    SyntaxKind,
    TypeElement,
    TypeLiteralNode,
    TypeNode,
    TypeReferenceNode,
    UnionTypeNode,
} from 'typescript';
import debug from './debug';
import { WidgetDescriptor, WidgetPropertyDescriptor } from './descriptors';
import { SyntaxError, locationString } from './errors';
import { Comment, ParsedSource, parseFile } from './parser';

export type FileScannerOptions = {
    defaultVersion?: string;
};

export class FileScanner {
    private parsedSource: ParsedSource | undefined;

    constructor(private program: Program, private file: string, private options?: FileScannerOptions) {}

    scanForWidget() {
        const parsed = parseFile(this.program, this.file);
        let widget: WidgetDescriptor | undefined;

        if (parsed) {
            this.parsedSource = parsed;

            const widgetDeclarations = parsed.comments.filter(this.hasWidgetModifier);

            if (widgetDeclarations.length > 1) {
                throw new SyntaxError(
                    `Multiple @widget declarations in ${this.file}, only the default export can be declared a widget`,
                    widgetDeclarations[1].compilerNode,
                );
            } else if (widgetDeclarations.length === 1) {
                debug('found @widget declaration in %s', this.file);

                widget = this.processWidget(widgetDeclarations[0]);
            }
        }

        return widget;
    }

    private hasWidgetModifier(comment: Comment) {
        return comment.commentBlock.tags.some((tag) => tag.tag === 'widget' || tag.tag === 'widgetName');
    }

    private getTagValue(tags: Spec[], tagName: string, fullText?: boolean) {
        const tag = tags.find((tag) => tag.tag === tagName);

        if (!tag) {
            return undefined;
        }

        const nameComponents = [tag.name];

        if (fullText && tag.description) {
            nameComponents.push(tag.description);
        }

        return nameComponents.join(' ');
    }

    private processWidget(widgetDeclaration: Comment) {
        if (widgetDeclaration.compilerNode.kind !== SyntaxKind.FunctionDeclaration) {
            throw new SyntaxError('@widget must be declared on a FunctionComponent', widgetDeclaration.compilerNode);
        }

        const funcDeclaration = widgetDeclaration.compilerNode as FunctionDeclaration;
        const tags = widgetDeclaration.commentBlock.tags;
        const widgetId = this.getTagValue(tags, 'widget') || funcDeclaration.name?.text;

        if (!widgetId) {
            throw new SyntaxError(
                'Unable to determine widget id, no explicit id provided and unable to determine function name',
                funcDeclaration,
            );
        }

        const widgetName = this.getTagValue(tags, 'widgetName', true) || widgetId;
        const widgetVersion = this.getTagValue(tags, 'widgetVersion') || this.options?.defaultVersion;

        const widget: WidgetDescriptor = {
            id: widgetId,
            name: widgetName,
            description: widgetDeclaration.commentBlock.description,
            version: widgetVersion,
            src: this.file,
            properties: [],
        };

        const propsType = this.getPropsType(funcDeclaration);

        if (propsType) {
            widget.properties = this.processProperties(propsType);
        }

        return widget;
    }

    private processProperties(propsType: TypeLiteralNode) {
        const properties: WidgetPropertyDescriptor[] = [];

        for (const member of propsType.members) {
            const name = member.name;

            if (!name) {
                throw new SyntaxError('Property has no name', member);
            }

            if (!('text' in name)) {
                throw new SyntaxError('Unable to determine property id', member);
            }

            const comment = this.getPropertyComment(member);
            const tags = comment?.commentBlock.tags ?? [];

            const propertyId = name.text;
            const propertyName = this.getTagValue(tags, 'propertyName', true) || propertyId;
            const propertyType =
                this.getTagValue(tags, 'propertyType') || this.determinePropertyType(propertyId, member);

            properties.push({
                name: propertyId,
                displayName: propertyName,
                type: propertyType,
                optional: this.isPropertyOptional(member),
            });
        }

        return properties;
    }

    private getPropertyComment(property: TypeElement) {
        return this.parsedSource?.comments?.find((comment) => comment.compilerNode === property);
    }

    private determinePropertyType(id: string, property: TypeElement) {
        // Default to text unless we can determine a better type;
        let type = 'text';

        const baseType = this.determineBaseType(property);

        switch (baseType?.kind) {
            case SyntaxKind.StringKeyword:
                type = 'text';
                break;

            case SyntaxKind.NumberKeyword:
                type = 'number';
                break;

            case SyntaxKind.BooleanKeyword:
                type = 'boolean';
                break;

            default:
                console.log(
                    `${locationString(property)}: not able to infer type for property ${id}, defaulting to 'text'`,
                );
                break;
        }

        return type;
    }

    private determineBaseType(property: TypeElement) {
        let typeNode: TypeNode | undefined;

        if (property.kind === SyntaxKind.PropertySignature) {
            typeNode = (property as PropertySignature).type;
        }

        if (typeNode?.kind === SyntaxKind.UnionType) {
            const unionType = typeNode as UnionTypeNode;

            // Remove undefined and null.
            const types = unionType.types.filter(
                (type) => type.kind !== SyntaxKind.UndefinedKeyword && type.kind !== SyntaxKind.NullKeyword,
            );

            if (types.length === 1) {
                typeNode = types[0];
            } else {
                debug('');
            }
        }

        return typeNode;
    }

    private isPropertyOptional(property: TypeElement) {
        if (property.questionToken) {
            return true;
        }

        if (property.kind === SyntaxKind.PropertySignature) {
            const typeNode = (property as PropertySignature).type;

            if (typeNode?.kind === SyntaxKind.UnionType) {
                const unionType = typeNode as UnionTypeNode;

                return unionType.types.some((type) => type.kind === SyntaxKind.UndefinedKeyword);
            }
        }

        return false;
    }

    private getPropsType(funcDeclaration: FunctionDeclaration) {
        const propsParam = funcDeclaration.parameters[0];
        let propsType: TypeLiteralNode | undefined;

        switch (propsParam?.type?.kind) {
            case SyntaxKind.TypeLiteral:
                propsType = propsParam.type as TypeLiteralNode;
                break;

            case SyntaxKind.TypeReference: {
                const name = (propsParam.type as TypeReferenceNode).typeName;

                if ('text' in name) {
                    propsType = this.parsedSource?.types[name.text];
                } else {
                    throw new SyntaxError(
                        'Unable to determine widget props type (qualified type references not supported)',
                        propsParam.type,
                    );
                }

                break;
            }

            default:
                if (propsParam?.type?.kind) {
                    throw new SyntaxError(
                        `Unable to determine widget props type from ${SyntaxKind[propsParam.type.kind]}`,
                        propsParam.type,
                    );
                }

                // Only an error if there is a parameter.
                if (propsParam) {
                    throw new SyntaxError('No type specified for widget props', propsParam);
                }

                break;
        }

        return propsType;
    }
}

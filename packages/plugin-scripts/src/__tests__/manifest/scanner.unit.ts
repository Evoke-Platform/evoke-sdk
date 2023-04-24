// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import dirtyChai from 'dirty-chai';
import { Dictionary } from 'lodash';
import { Scanner, WidgetDescriptor } from '../../manifest';

chai.use(dirtyChai).use(chaiAsPromised);

describe('Scanner', () => {
    const scanner = new Scanner('src/__tests__/manifest/testFiles', { defaultVersion: '1-test' });
    let widgets: Dictionary<WidgetDescriptor> = {};

    before(async () => {
        widgets = (await scanner.scan()).widgets;
    });

    describe('widget', () => {
        it('detects components marked with @widget', () => {
            expect(widgets['Basic']).to.eql({
                id: 'Basic',
                name: 'Basic',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/basic.tsx',
                properties: [],
            });
        });

        it('detects components marked with @widgetName', () => {
            expect(widgets['Basic2']).to.eql({
                id: 'Basic2',
                name: 'Basic2',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/basic2.tsx',
                properties: [],
            });
        });

        it('allows overriding widget id', () => {
            expect(widgets['CustomId']).to.eql({
                id: 'CustomId',
                name: 'CustomId',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/widgetId.tsx',
                properties: [],
            });
        });

        it('allows setting widget name', () => {
            expect(widgets['WidgetName']).to.eql({
                id: 'WidgetName',
                name: 'Test Widget Name',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/widgetName.tsx',
                properties: [],
            });
        });

        it('allows setting widget description', () => {
            expect(widgets['WidgetDescription']).to.eql({
                id: 'WidgetDescription',
                name: 'WidgetDescription',
                description: 'This is a sample description for a widget. It may wrap to multiple lines.',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/description.tsx',
                properties: [],
            });
        });

        it('allows overriding version for widget', () => {
            expect(widgets['WidgetVersion']).to.eql({
                id: 'WidgetVersion',
                name: 'WidgetVersion',
                description: '',
                version: 'testVersion',
                src: 'src/__tests__/manifest/testFiles/version.tsx',
                properties: [],
            });
        });

        it('fails if module contains multiple widgets', async () => {
            const scanner = new Scanner('src/__tests__/manifest/badFiles/multipleWidgets');

            await expect(scanner.scan()).to.be.rejectedWith(
                'Multiple @widget declarations in src/__tests__/manifest/badFiles/multipleWidgets/widget.tsx, only the default export can be declared a widget',
            );
        }).timeout(5000);

        it('fails if @widget is not on a function', async () => {
            const scanner = new Scanner('src/__tests__/manifest/badFiles/notFunctionComponent');

            await expect(scanner.scan()).to.be.rejectedWith('@widget must be declared on a FunctionComponent');
        }).timeout(5000);
    });

    describe('props', () => {
        it('detects properties through type reference', () => {
            expect(widgets['PropsTypeReference']).to.eql({
                id: 'PropsTypeReference',
                name: 'PropsTypeReference',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/typeReferenceProps.tsx',
                properties: [
                    {
                        name: 'textProperty',
                        displayName: 'textProperty',
                        type: 'text',
                        optional: false,
                    },
                ],
            });
        });

        it('detects properties on type literal', () => {
            expect(widgets['PropsTypeLiteral']).to.eql({
                id: 'PropsTypeLiteral',
                name: 'PropsTypeLiteral',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/typeLiteralProps.tsx',
                properties: [
                    {
                        name: 'textProperty',
                        displayName: 'textProperty',
                        type: 'text',
                        optional: false,
                    },
                ],
            });
        });

        xit('detects properties of intersection types', () => {
            expect(widgets['PropsIntersectionType']).to.eql({
                id: 'PropsIntersectionType',
                name: 'PropsIntersectionType',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/intersectionTypeProps.tsx',
                properties: [
                    {
                        name: 'base',
                        displayName: 'base',
                        type: 'text',
                        optional: false,
                    },
                    {
                        name: 'textProperty',
                        displayName: 'textProperty',
                        type: 'text',
                        optional: false,
                    },
                ],
            });
        });

        it('allows setting property name', () => {
            expect(widgets['PropertyName']).to.eql({
                id: 'PropertyName',
                name: 'PropertyName',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/propertyName.tsx',
                properties: [
                    {
                        name: 'textProperty',
                        displayName: 'Text Property',
                        type: 'text',
                        optional: false,
                    },
                ],
            });
        });

        it('allows overriding property type', () => {
            expect(widgets['PropertyType']).to.eql({
                id: 'PropertyType',
                name: 'PropertyType',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/propertyType.tsx',
                properties: [
                    {
                        name: 'choicesProperty',
                        displayName: 'choicesProperty',
                        type: 'choices',
                        optional: false,
                    },
                ],
            });
        });

        it('detects optional properties', () => {
            expect(widgets['OptionalProperty']).to.eql({
                id: 'OptionalProperty',
                name: 'OptionalProperty',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/optionalProperty.tsx',
                properties: [
                    {
                        name: 'textProperty',
                        displayName: 'textProperty',
                        type: 'text',
                        optional: true,
                    },
                ],
            });
        });

        it('detects properties that can be undefined', () => {
            expect(widgets['OptionalProperty2']).to.eql({
                id: 'OptionalProperty2',
                name: 'OptionalProperty2',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/optionalProperty2.tsx',
                properties: [
                    {
                        name: 'textProperty',
                        displayName: 'textProperty',
                        type: 'text',
                        optional: true,
                    },
                ],
            });
        });

        it('infers type of number properties', () => {
            expect(widgets['NumberProperty']).to.eql({
                id: 'NumberProperty',
                name: 'NumberProperty',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/numberProperty.tsx',
                properties: [
                    {
                        name: 'numProperty',
                        displayName: 'numProperty',
                        type: 'number',
                        optional: false,
                    },
                ],
            });
        });

        xit('infers type of record properties', () => {
            expect(widgets['RecordProperty']).to.eql({
                id: 'RecordProperty',
                name: 'RecordProperty',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/recordProperty.tsx',
                properties: [
                    {
                        name: 'recordProperty',
                        displayName: 'recordProperty',
                        type: 'inputGroup',
                        optional: false,
                        inputGroup: [
                            {
                                name: 'nested1',
                                displayName: 'nested1',
                                type: 'text',
                                optional: false,
                            },
                            {
                                name: 'nested2',
                                displayName: 'nested2',
                                type: 'number',
                                optional: false,
                            },
                        ],
                    },
                ],
            });
        });
    });
});

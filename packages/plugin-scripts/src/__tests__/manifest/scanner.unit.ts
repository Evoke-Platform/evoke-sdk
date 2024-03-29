// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import dirtyChai from 'dirty-chai';
import { Dictionary } from 'lodash';
import { ItemDescriptor, Scanner } from '../../manifest';

chai.use(dirtyChai).use(chaiAsPromised);

const Timeout = 15000;

describe('Scanner', () => {
    const scanner = new Scanner('src/__tests__/manifest/testFiles', { defaultVersion: '1-test' });
    let widgets: Dictionary<ItemDescriptor> = {};
    let paymentGateways: Dictionary<ItemDescriptor> = {};

    before(async function () {
        this.timeout(Timeout);

        const scanResults = await scanner.scan();

        widgets = scanResults.widgets;
        paymentGateways = scanResults.paymentGateways;
    });

    describe('widget', () => {
        it('detects components marked with @widget', () => {
            expect(widgets['Basic']).to.eql({
                id: 'Basic',
                name: 'Basic',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/widgets/basic.tsx',
                properties: [],
            });
        });

        it('detects components marked with @widgetName', () => {
            expect(widgets['Basic2']).to.eql({
                id: 'Basic2',
                name: 'Basic2',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/widgets/basic2.tsx',
                properties: [],
            });
        });

        it('allows overriding widget id', () => {
            expect(widgets['CustomId']).to.eql({
                id: 'CustomId',
                name: 'CustomId',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/widgets/widgetId.tsx',
                properties: [],
            });
        });

        it('allows setting widget name', () => {
            expect(widgets['WidgetName']).to.eql({
                id: 'WidgetName',
                name: 'Test Widget Name',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/widgets/widgetName.tsx',
                properties: [],
            });
        });

        it('allows setting widget description', () => {
            expect(widgets['WidgetDescription']).to.eql({
                id: 'WidgetDescription',
                name: 'WidgetDescription',
                description: 'This is a sample description for a widget. It may wrap to multiple lines.',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/widgets/description.tsx',
                properties: [],
            });
        });

        it('allows overriding version for widget', () => {
            expect(widgets['WidgetVersion']).to.eql({
                id: 'WidgetVersion',
                name: 'WidgetVersion',
                description: '',
                version: 'testVersion',
                src: 'src/__tests__/manifest/testFiles/widgets/version.tsx',
                properties: [],
            });
        });

        it('fails if module contains multiple widgets', async () => {
            const scanner = new Scanner('src/__tests__/manifest/badFiles/widgets/multipleWidgets');

            await expect(scanner.scan()).to.be.rejectedWith(
                'Multiple @widget declarations in src/__tests__/manifest/badFiles/widgets/multipleWidgets/widget.tsx, only the default export can be declared a widget',
            );
        }).timeout(Timeout);

        it('fails if @widget is not on a function', async () => {
            const scanner = new Scanner('src/__tests__/manifest/badFiles/widgets/notFunctionComponent');

            await expect(scanner.scan()).to.be.rejectedWith('@widget must be declared on a FunctionComponent');
        }).timeout(Timeout);
    });

    describe('paymentGateway', () => {
        it('detects classes marked with @paymentGateway', () => {
            expect(paymentGateways['BasicGateway']).to.eql({
                id: 'BasicGateway',
                name: 'BasicGateway',
                description: '',
                version: '1-test',
                properties: [],
            });
        });

        it('detects classes marked with @paymentGatewayName', () => {
            expect(paymentGateways['BasicGateway2']).to.eql({
                id: 'BasicGateway2',
                name: 'BasicGateway2',
                description: '',
                version: '1-test',
                properties: [],
            });
        });

        it('allows overriding payment gateway id', () => {
            expect(paymentGateways['CustomId']).to.eql({
                id: 'CustomId',
                name: 'CustomId',
                description: '',
                version: '1-test',
                properties: [],
            });
        });

        it('allows setting payment gateway name', () => {
            expect(paymentGateways['PaymentGatewayName']).to.eql({
                id: 'PaymentGatewayName',
                name: 'Test Gateway Name',
                description: '',
                version: '1-test',
                properties: [],
            });
        });

        it('allows setting payment gateway description', () => {
            expect(paymentGateways['PaymentGatewayDescription']).to.eql({
                id: 'PaymentGatewayDescription',
                name: 'PaymentGatewayDescription',
                description: 'This is a sample description for a payment gateway. It may wrap to multiple lines.',
                version: '1-test',
                properties: [],
            });
        });

        it('detects multiple payment gateways in same file', () => {
            expect(paymentGateways['PaymentGatewayMultiple1']).to.eql({
                id: 'PaymentGatewayMultiple1',
                name: 'PaymentGatewayMultiple1',
                description: '',
                version: '1-test',
                properties: [],
            });

            expect(paymentGateways['PaymentGatewayMultiple2']).to.eql({
                id: 'PaymentGatewayMultiple2',
                name: 'PaymentGatewayMultiple2',
                description: '',
                version: '1-test',
                properties: [],
            });
        });

        it('fails if @paymentGateway is not on a class', async () => {
            const scanner = new Scanner('src/__tests__/manifest/badFiles/paymentGateways/notClass');

            await expect(scanner.scan()).to.be.rejectedWith('@paymentGateway must be declared on a class');
        }).timeout(Timeout);

        it('detects payment gateway properties', () => {
            expect(paymentGateways['TestGatewayProperties']).to.eql({
                id: 'TestGatewayProperties',
                name: 'TestGatewayProperties',
                description: '',
                version: '1-test',
                properties: [
                    {
                        name: 'text',
                        displayName: 'text',
                        type: 'text',
                        optional: false,
                    },
                    {
                        name: 'num',
                        displayName: 'num',
                        type: 'number',
                        optional: true,
                    },
                ],
            });
        });
    });

    describe('props', () => {
        it('detects properties through type reference', () => {
            expect(widgets['PropsTypeReference']).to.eql({
                id: 'PropsTypeReference',
                name: 'PropsTypeReference',
                description: '',
                version: '1-test',
                src: 'src/__tests__/manifest/testFiles/props/typeReferenceProps.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/typeLiteralProps.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/intersectionTypeProps.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/propertyName.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/propertyType.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/optionalProperty.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/optionalProperty2.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/numberProperty.tsx',
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
                src: 'src/__tests__/manifest/testFiles/props/recordProperty.tsx',
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

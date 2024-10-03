// Copyright (c) 2024 System Automation Corporation.
// This file is licensed under the MIT License.

import { render } from '@testing-library/react';
import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import 'global-jsdom/register';
import sinon from 'sinon';
import {
    DocumentSubscription,
    InstanceSubscription,
    NotificationContext,
    NotificationContextType,
} from '../../notification/NotificationProvider.js';
import { SignalRConnectionProvider, useSignalRConnection } from '../../signalr/index.js';

chai.use(dirtyChai);

type TestComponentProps = {
    instanceTopic?: string;
    documentTopic?: string;
};

describe('useSignalRConnection', () => {
    // Callbacks to receive change notifications.
    const callbacks = {
        instanceCallback() {},
        documentCallback() {},
    };

    const TestComponent = ({ instanceTopic, documentTopic }: TestComponentProps) => {
        const { instanceChanges, documentChanges } = useSignalRConnection();

        if (instanceTopic) {
            instanceChanges?.subscribe(instanceTopic, callbacks.instanceCallback);
        }

        if (documentTopic) {
            documentChanges?.subscribe(documentTopic, callbacks.documentCallback);
        }

        return null;
    };

    const instanceSubscription: InstanceSubscription = {
        subscribe() {},
        unsubscribe() {},
    };

    const documentSubscription: DocumentSubscription = {
        subscribe() {},
        unsubscribe() {},
    };

    const notifications: NotificationContextType = {
        instanceChanges: instanceSubscription,
        documentChanges: documentSubscription,
    };

    afterEach(() => {
        sinon.restore();
    });

    it('subscribes to instance change notifications', () => {
        sinon.mock(instanceSubscription).expects('subscribe').withArgs('testObject');

        render(
            <NotificationContext.Provider value={notifications}>
                <SignalRConnectionProvider>
                    <TestComponent instanceTopic="testObject" />
                </SignalRConnectionProvider>
            </NotificationContext.Provider>,
        );

        sinon.verify();
    });

    it('notifies callback of instance changes', () => {
        let callback: Parameters<InstanceSubscription['subscribe']>[1] | undefined;

        sinon.stub(instanceSubscription, 'subscribe').callsFake((_, cb) => {
            callback = cb;
        });

        sinon.mock(callbacks).expects('instanceCallback').withExactArgs('instance1', 'instance2');

        render(
            <NotificationContext.Provider value={notifications}>
                <SignalRConnectionProvider>
                    <TestComponent instanceTopic="testObject" />
                </SignalRConnectionProvider>
            </NotificationContext.Provider>,
        );

        expect(callback).to.not.be.undefined();

        // Simulate a notification.
        callback?.(
            { objectId: 'testObject', instanceId: 'instance1' },
            { objectId: 'testObject', instanceId: 'instance2' },
        );

        sinon.verify();
    });

    it('subscribes to document change notifications', () => {
        sinon.mock(documentSubscription).expects('subscribe').withArgs('docObject', 'testInstance');

        render(
            <NotificationContext.Provider value={notifications}>
                <SignalRConnectionProvider>
                    <TestComponent documentTopic="docObject/testInstance" />
                </SignalRConnectionProvider>
            </NotificationContext.Provider>,
        );

        sinon.verify();
    });

    it('notifies callback of document changes', () => {
        let callback: Parameters<DocumentSubscription['subscribe']>[2] | undefined;

        sinon.stub(documentSubscription, 'subscribe').callsFake((_, _1, cb) => {
            callback = cb;
        });

        sinon.mock(callbacks).expects('documentCallback').withExactArgs(
            {
                objectId: 'docObject',
                instanceId: 'testInstance',
                documentId: 'doc1',
                type: 'type1',
            },
            {
                objectId: 'docObject',
                instanceId: 'testInstance',
                documentId: 'doc2',
                type: 'type2',
            },
        );

        render(
            <NotificationContext.Provider value={notifications}>
                <SignalRConnectionProvider>
                    <TestComponent documentTopic="docObject/testInstance" />
                </SignalRConnectionProvider>
            </NotificationContext.Provider>,
        );

        expect(callback).to.not.be.undefined();

        // Simulate a notification.
        callback?.(
            { objectId: 'docObject', instanceId: 'testInstance', documentId: 'doc1', type: 'type1' },
            { objectId: 'docObject', instanceId: 'testInstance', documentId: 'doc2', type: 'type2' },
        );

        sinon.verify();
    });
});

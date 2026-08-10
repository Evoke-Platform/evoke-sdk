// Copyright (c) 2026 System Automation Corporation.
// This file is licensed under the MIT License.

import { HubConnection } from '@microsoft/signalr';
import { render } from '@testing-library/react';
import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import 'global-jsdom/register';
import { useEffect } from 'react';
import sinon, { SinonStub } from 'sinon';
import { ApiServices } from '../../api/index.js';
import NotificationProvider, {
    DocumentSubscription,
    InstanceSubscription,
    useNotification,
} from '../../notification/NotificationProvider.js';
import { ObjectStore } from '../../objects/index.js';

chai.use(dirtyChai);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('NotificationProvider', () => {
    let postStub: SinonStub;
    let getStub: SinonStub;
    let onStub: SinonStub;
    let offStub: SinonStub;

    let instanceChanges: InstanceSubscription | undefined;
    let documentChanges: DocumentSubscription | undefined;

    const TestConsumer = () => {
        const notification = useNotification();

        useEffect(() => {
            instanceChanges = notification.instanceChanges;
            documentChanges = notification.documentChanges;
        }, [notification]);

        return null;
    };

    const renderProvider = async () => {
        render(
            <NotificationProvider>
                <TestConsumer />
            </NotificationProvider>,
        );

        // Let the connection-negotiation effect resolve and populate the context.
        await flush();
        await flush();
    };

    beforeEach(() => {
        instanceChanges = undefined;
        documentChanges = undefined;

        postStub = sinon.stub(ApiServices.prototype, 'post') as unknown as SinonStub;
        getStub = sinon.stub(ApiServices.prototype, 'get') as unknown as SinonStub;
        onStub = sinon.stub(HubConnection.prototype, 'on');
        offStub = sinon.stub(HubConnection.prototype, 'off');
        sinon.stub(HubConnection.prototype, 'start').resolves();
        sinon.stub(HubConnection.prototype, 'stop').resolves();

        postStub
            .withArgs('/notification/hubs/instanceChanges/negotiate')
            .resolves({ url: 'http://fake-signalr/instanceChanges', accessToken: 'fake-token' });
        postStub
            .withArgs('/notification/hubs/documentChanges/negotiate')
            .resolves({ url: 'http://fake-signalr/documentChanges', accessToken: 'fake-token' });
    });

    afterEach(() => {
        sinon.restore();
        ObjectStore.invalidateAllCache();
    });

    context('instanceChanges', () => {
        it('registers the hub listener under the object itself when it is already a root', async () => {
            getStub
                .withArgs('data/objects/Root/effective')
                .resolves({ id: 'Root', name: 'Root', description: '', rootObjectId: 'Root' });

            await renderProvider();

            const callback = () => {};
            instanceChanges?.subscribe('Root', callback);
            await flush();

            expect(onStub.calledWith('Root', callback)).to.be.true();
        });

        it('resolves a nested subtype to its root before registering the hub listener', async () => {
            getStub
                .withArgs('data/objects/Subtype2A/effective')
                .resolves({ id: 'Subtype2A', name: 'Subtype2A', description: '', rootObjectId: 'Root' });

            await renderProvider();

            const callback = () => {};
            instanceChanges?.subscribe('Subtype2A', callback);
            await flush();

            expect(onStub.calledWith('Root', callback)).to.be.true();
            expect(onStub.calledWith('Subtype2A', callback)).to.be.false();
        });

        it('resolves the same root on unsubscribe and removes the exact callback', async () => {
            getStub
                .withArgs('data/objects/Subtype2A/effective')
                .resolves({ id: 'Subtype2A', name: 'Subtype2A', description: '', rootObjectId: 'Root' });

            await renderProvider();

            const callback = () => {};
            instanceChanges?.unsubscribe('Subtype2A', callback);
            await flush();

            expect(offStub.calledWith('Root', callback)).to.be.true();
        });

        it('removes all listeners under the resolved root when no callback is given', async () => {
            getStub
                .withArgs('data/objects/Subtype2A/effective')
                .resolves({ id: 'Subtype2A', name: 'Subtype2A', description: '', rootObjectId: 'Root' });

            await renderProvider();

            instanceChanges?.unsubscribe('Subtype2A');
            await flush();

            expect(offStub.calledWith('Root')).to.be.true();
            expect(offStub.firstCall.args).to.eql(['Root']);
        });

        it('warns and does not register a listener when the object cannot be resolved', async () => {
            getStub.withArgs('data/objects/DoesNotExist/effective').rejects(new Error('Not Found'));

            const warnStub = sinon.stub(console, 'warn');

            await renderProvider();

            instanceChanges?.subscribe('DoesNotExist', () => {});
            await flush();

            expect(onStub.called).to.be.false();
            expect(warnStub.calledWithMatch(/DoesNotExist/)).to.be.true();
        });

        it('warns and does not throw when unsubscribing from an object that cannot be resolved', async () => {
            getStub.withArgs('data/objects/DoesNotExist/effective').rejects(new Error('Not Found'));

            const warnStub = sinon.stub(console, 'warn');

            await renderProvider();

            expect(() => instanceChanges?.unsubscribe('DoesNotExist', () => {})).to.not.throw();
            await flush();

            expect(warnStub.calledWithMatch(/DoesNotExist/)).to.be.true();
        });

        it('notifies subscribers of different subtypes that share the same root', async () => {
            getStub
                .withArgs('data/objects/Subtype1/effective')
                .resolves({ id: 'Subtype1', name: 'Subtype1', description: '', rootObjectId: 'Root' });
            getStub
                .withArgs('data/objects/Subtype2/effective')
                .resolves({ id: 'Subtype2', name: 'Subtype2', description: '', rootObjectId: 'Root' });

            await renderProvider();

            const callback1 = () => {};
            const callback2 = () => {};
            instanceChanges?.subscribe('Subtype1', callback1);
            instanceChanges?.subscribe('Subtype2', callback2);
            await flush();

            expect(onStub.calledWith('Root', callback1)).to.be.true();
            expect(onStub.calledWith('Root', callback2)).to.be.true();
        });
    });

    context('documentChanges', () => {
        it('resolves a nested subtype to its root before registering the hub listener', async () => {
            getStub
                .withArgs('data/objects/Subtype2A/effective')
                .resolves({ id: 'Subtype2A', name: 'Subtype2A', description: '', rootObjectId: 'Root' });

            await renderProvider();

            const callback = () => {};
            documentChanges?.subscribe('Subtype2A', 'instance1', callback);
            await flush();

            expect(onStub.calledWith('Root/instance1', callback)).to.be.true();
            expect(onStub.calledWith('Subtype2A/instance1', callback)).to.be.false();
        });

        it('resolves the same root on unsubscribe and removes the exact callback', async () => {
            getStub
                .withArgs('data/objects/Subtype2A/effective')
                .resolves({ id: 'Subtype2A', name: 'Subtype2A', description: '', rootObjectId: 'Root' });

            await renderProvider();

            const callback = () => {};
            documentChanges?.unsubscribe('Subtype2A', 'instance1', callback);
            await flush();

            expect(offStub.calledWith('Root/instance1', callback)).to.be.true();
        });

        it('warns and does not register a listener when the object cannot be resolved', async () => {
            getStub.withArgs('data/objects/DoesNotExist/effective').rejects(new Error('Not Found'));

            const warnStub = sinon.stub(console, 'warn');

            await renderProvider();

            documentChanges?.subscribe('DoesNotExist', 'instance1', () => {});
            await flush();

            expect(onStub.called).to.be.false();
            expect(warnStub.calledWithMatch(/DoesNotExist/)).to.be.true();
        });

        it('warns and does not throw when unsubscribing from an object that cannot be resolved', async () => {
            getStub.withArgs('data/objects/DoesNotExist/effective').rejects(new Error('Not Found'));

            const warnStub = sinon.stub(console, 'warn');

            await renderProvider();

            expect(() => documentChanges?.unsubscribe('DoesNotExist', 'instance1', () => {})).to.not.throw();
            await flush();

            expect(warnStub.calledWithMatch(/DoesNotExist/)).to.be.true();
        });
    });
});

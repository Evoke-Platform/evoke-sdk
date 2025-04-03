// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import sinon, { SinonStub } from 'sinon';
import { ApiServices } from '../../api/index.js';
import { ObjWithRoot, ObjectStore } from '../../objects/index.js';
import { assertionCallback } from '../helpers.js';

chai.use(dirtyChai);

describe('ObjectStore', () => {
    const apiServices = {
        get() {},
    } as unknown as ApiServices;

    const objectStore = new ObjectStore(apiServices, 'testObject');

    afterEach(() => {
        sinon.restore();
        ObjectStore.invalidateAllCache();
    });

    context('#get', () => {
        it('returns object', async () => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            stub.withArgs('data/objects/testObject/effective').resolves({
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
            });

            const result = await objectStore.get();

            expect(result).to.eql({ id: 'testObject', name: 'Test Object', rootObjectId: 'testObject' });
        });

        it('returns object in callback', (done) => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            stub.withArgs('data/objects/testObject/effective').resolves({
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
            });

            objectStore.get(
                assertionCallback(done, (result) => {
                    expect(result).to.eql({ id: 'testObject', name: 'Test Object', rootObjectId: 'testObject' });
                }),
            );
        });

        it('caches object and uses cached version on subsequent calls', async () => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            stub.withArgs('data/objects/testObject/effective').resolves({
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
            });

            const result1 = await objectStore.get();
            expect(result1).to.eql({ id: 'testObject', name: 'Test Object', rootObjectId: 'testObject' });
            expect(stub.callCount).to.equal(1);

            const result2 = await objectStore.get();
            expect(result2).to.eql({ id: 'testObject', name: 'Test Object', rootObjectId: 'testObject' });
            expect(stub.callCount).to.equal(1); // still only called once
        });

        it('creates different cache entries based on different options', async () => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            stub.withArgs('data/objects/testObject/effective').resolves({
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
            });

            // First call with default options
            await objectStore.get();
            expect(stub.callCount).to.equal(1);

            // Call with different options should create a new cache entry
            await objectStore.get({ sanitized: true });
            expect(stub.callCount).to.equal(2);

            // Call with same options should use cache
            await objectStore.get({ sanitized: true });
            expect(stub.callCount).to.equal(2); // still 2 calls
        });

        it('alphabetizes properties by default', async () => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            const testObj = {
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
                properties: [
                    { id: 'c', name: 'C Prop', type: 'string' },
                    { id: 'a', name: 'A Prop', type: 'string' },
                    { id: 'b', name: 'B Prop', type: 'string' },
                ],
            };

            stub.withArgs('data/objects/testObject/effective').resolves(testObj as ObjWithRoot);

            // Properties should be alphabetized by default
            const result = await objectStore.get();
            expect(result.properties?.[0].id).to.equal('a');
            expect(result.properties?.[1].id).to.equal('b');
            expect(result.properties?.[2].id).to.equal('c');
        });

        it('allows bypassing cache with bypassCache option', async () => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            stub.withArgs('data/objects/testObject/effective').resolves({
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
            });

            await objectStore.get();
            expect(stub.callCount).to.equal(1);

            await objectStore.get({ bypassCache: true });
            expect(stub.callCount).to.equal(2);
        });

        it('invalidates cache for specific object', async () => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            stub.withArgs('data/objects/testObject/effective').resolves({
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
            });

            await objectStore.get();
            expect(stub.callCount).to.equal(1);

            objectStore.invalidateCache();

            // Second call should hit API again
            await objectStore.get();
            expect(stub.callCount).to.equal(2);
        });
    });
});

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import sinon, { SinonStub } from 'sinon';
import { ApiServices } from '../../api/index.js';
import { ObjWithRoot, ObjectStore, PropertyType } from '../../objects/index.js';
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
            sinon
                .stub(apiServices, 'get')
                .withArgs('data/objects/testObject/effective', sinon.match.any, sinon.match.func)
                .yields(null, { id: 'testObject', name: 'Test Object', rootObjectId: 'testObject' });

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

            // different options should create a different cache entry
            await objectStore.get({ flattenProperties: true });
            expect(stub.callCount).to.equal(2);
        });

        it('caches based on options and alphabetizes properties by default', async () => {
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

            // first call should hit API and alphabetize properties
            const result = await objectStore.get();
            expect(result.properties?.[0].id).to.equal('a');
            expect(result.properties?.[1].id).to.equal('b');
            expect(result.properties?.[2].id).to.equal('c');

            //  skipAlphabetize to not alphabetize properties
            stub.resetHistory();
            const result2 = await objectStore.get({ skipAlphabetize: true });
            expect(result2.properties?.[0].id).to.equal('c');
            expect(result2.properties?.[1].id).to.equal('a');
            expect(result2.properties?.[2].id).to.equal('b');
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

        it('correctly flattens properties when flattenProperties option is provided', async () => {
            const stub = sinon.stub(apiServices, 'get') as unknown as SinonStub<[string], Promise<ObjWithRoot>>;

            const objWithUserProperty = {
                id: 'testObject',
                name: 'Test Object',
                rootObjectId: 'testObject',
                properties: [{ id: 'user', name: 'User', type: 'user' as PropertyType }],
            };

            stub.withArgs('data/objects/testObject/effective').resolves(objWithUserProperty as ObjWithRoot);

            // With flattenProperties option
            const result = await objectStore.get({ flattenProperties: true });
            expect(result.properties?.length).to.equal(2);
            expect(result.properties?.[0].id).to.equal('user.id');
            expect(result.properties?.[1].id).to.equal('user.name');

            // without
            stub.resetHistory();
            const result2 = await objectStore.get();
            expect(result2.properties?.length).to.equal(1);
            expect(result2.properties?.[0].id).to.equal('user');
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

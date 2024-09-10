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
    });
});

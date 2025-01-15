// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import axios from 'axios';
import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ApiServices } from '../../api/index.js';
import { paramsSerializer } from '../../api/paramsSerializer.js';
import { assertionCallback } from '../helpers.js';

chai.use(dirtyChai);

const testItem = { id: 'item1', name: 'Item 1' };

const server = setupServer(
    // Return testItem
    rest.get('http://localhost/item', (req, res, ctx) => {
        return res(ctx.json(testItem));
    }),
    rest.post('http://localhost/item', (req, res, ctx) => {
        return res(ctx.json(testItem));
    }),
    rest.put('http://localhost/item', (req, res, ctx) => {
        return res(ctx.json(testItem));
    }),
    rest.patch('http://localhost/item', (req, res, ctx) => {
        return res(ctx.json(testItem));
    }),
    rest.delete('http://localhost/item', (req, res, ctx) => {
        return res(ctx.json(testItem));
    }),

    // Return request body in response
    rest.post('http://localhost/echo', async (req, res, ctx) => {
        return res(ctx.json(await req.json()));
    }),
    rest.put('http://localhost/echo', async (req, res, ctx) => {
        return res(ctx.json(await req.json()));
    }),
    rest.patch('http://localhost/echo', async (req, res, ctx) => {
        return res(ctx.json(await req.json()));
    }),

    // Return contents of Echo-Header in response
    rest.get('http://localhost/echoHeader', (req, res, ctx) => {
        return res(ctx.text(req.headers.get('Echo-Header') ?? ''));
    }),
    rest.post('http://localhost/echoHeader', (req, res, ctx) => {
        return res(ctx.text(req.headers.get('Echo-Header') ?? ''));
    }),
    rest.put('http://localhost/echoHeader', (req, res, ctx) => {
        return res(ctx.text(req.headers.get('Echo-Header') ?? ''));
    }),
    rest.patch('http://localhost/echoHeader', (req, res, ctx) => {
        return res(ctx.text(req.headers.get('Echo-Header') ?? ''));
    }),
    rest.delete('http://localhost/echoHeader', (req, res, ctx) => {
        return res(ctx.text(req.headers.get('Echo-Header') ?? ''));
    }),

    // Return contents of params in response
    rest.get('http://localhost/params', (req, res, ctx) => {
        return res(ctx.text(req.url.search ?? ''));
    }),
);

describe('ApiServices', () => {
    before(() => {
        server.listen();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    after(() => {
        server.close();
    });

    context('without authentication context', () => {
        it('does not add Authorization header', async () => {
            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            let authHeader: string | null = null;

            server.use(
                rest.get('http://localhost/', (req, res) => {
                    authHeader = req.headers.get('Authorization');

                    return res();
                }),
            );

            await services.get('/');

            expect(authHeader).to.be.null();
        });
    });

    context('with authentication context', () => {
        it('adds Authorization header', async () => {
            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }), {
                account: {
                    id: 'testuser',
                    name: 'Test User',
                },
                logout: () => {},
                getAccessToken: () => Promise.resolve('accesstoken'),
            });

            let authHeader: string | null = null;

            server.use(
                rest.get('http://localhost/', (req, res) => {
                    authHeader = req.headers.get('Authorization');

                    return res();
                }),
            );

            await services.get('/');

            expect(authHeader).to.eql('Bearer accesstoken');
        });
    });

    describe('#get', () => {
        const services = new ApiServices(axios.create({ baseURL: 'http://localhost/', paramsSerializer }));

        describe('(url) => Promise', () => {
            it('returns response data', async () => {
                const data = await services.get('/item');

                expect(data).to.eql(testItem);
            });
        });

        describe('(url, config) => Promise', () => {
            it('sends headers', async () => {
                const data = await services.get('/echoHeader', { headers: { 'Echo-Header': 'get header' } });

                expect(data).to.eql('get header');
            });

            it('sends undefined params', async () => {
                const data = await services.get('/params', { params: undefined });

                expect(data).to.eql('');
            });

            it('filters out undefined params value', async () => {
                const data = await services.get('/params', { params: { param1: undefined } });

                expect(data).to.eql('');
            });

            it('filters out empty params key', async () => {
                const data = await services.get('/params', { params: { '': 'value' } });

                expect(data).to.eql('');
            });

            it('sends string params', async () => {
                const data = await services.get('/params', { params: { param1: 'param1 value', param2: '' } });

                expect(data).to.eql('?param1=param1+value&param2=');
            });

            it('sends number params', async () => {
                const data = await services.get('/params', { params: { 0: 0 } });

                expect(data).to.eql('?0=0');
            });

            it('sends object params', async () => {
                const data = await services.get('/params', {
                    params: {
                        filter: {
                            where: {
                                or: [
                                    { and: [{ a: { regexp: 'valueA' }, b: { eq: 'valueB' } }] },
                                    { and: [{ a: { regexp: 'another ValueA' }, b: { eq: 'another ValueB' } }] },
                                ],
                            },
                        },
                    },
                });

                expect(data).to.eql(
                    '?filter=%7B%22where%22%3A%7B%22or%22%3A%5B%7B%22and%22%3A%5B%7B%22a%22%3A%7B%22regexp%22%3A%22valueA%22%7D%2C%22b%22%3A%7B%22eq%22%3A%22valueB%22%7D%7D%5D%7D%2C%7B%22and%22%3A%5B%7B%22a%22%3A%7B%22regexp%22%3A%22another+ValueA%22%7D%2C%22b%22%3A%7B%22eq%22%3A%22another+ValueB%22%7D%7D%5D%7D%5D%7D%7D',
                );
            });

            it('overrides paramsSerializer', async () => {
                const data = await services.get('/params', {
                    params: {
                        param1: 'param1 value',
                    },
                    paramsSerializer: (params, options) => {
                        return 'param1=custom+paramsSerializer';
                    },
                });

                expect(data).to.eql('?param1=custom+paramsSerializer');
            });
        });

        describe('(url, cb)', () => {
            it('returns response data', (done) => {
                services.get(
                    '/item',
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testItem);
                    }),
                );
            });
        });

        describe('(url, config, cb)', () => {
            it('sends headers', (done) => {
                services.get(
                    '/echoHeader',
                    { headers: { 'Echo-Header': 'get header' } },
                    assertionCallback(done, (data) => {
                        expect(data).to.eql('get header');
                    }),
                );
            });
        });
    });

    describe('#post', () => {
        const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
        const testPayload = { test: 'post data', context: '#post' };
        const testConfig = { headers: { 'Echo-Header': 'post header' } };

        describe('(url) => Promise', () => {
            it('returns response data', async () => {
                const data = await services.post('/item');

                expect(data).to.eql(testItem);
            });
        });

        describe('(url, data) => Promise', () => {
            it('posts data', async () => {
                const data = await services.post('/echo', testPayload);

                expect(data).to.eql(testPayload);
            });
        });

        describe('(url, data, config) => Promise', () => {
            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            it('posts data', async () => {
                const data = await services.post('/echo', testPayload, testConfig);

                expect(data).to.eql(testPayload);
            });

            it('sends headers', async () => {
                const data = await services.post('/echoHeader', testPayload, testConfig);

                expect(data).to.eql('post header');
            });
        });

        describe('(url, cb)', () => {
            it('returns response data', (done) => {
                services.post(
                    '/item',
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testItem);
                    }),
                );
            });
        });

        describe('(url, data, cb)', () => {
            it('posts data', (done) => {
                services.post(
                    '/echo',
                    testPayload,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testPayload);
                    }),
                );
            });
        });

        describe('(url, data, config, cb)', () => {
            it('posts data', (done) => {
                services.post(
                    '/echo',
                    testPayload,
                    testConfig,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testPayload);
                    }),
                );
            });

            it('sends headers', (done) => {
                services.post(
                    '/echoHeader',
                    testPayload,
                    testConfig,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql('post header');
                    }),
                );
            });
        });
    });

    describe('#put', () => {
        const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
        const testPayload = { test: 'put data', context: '#put' };
        const testConfig = { headers: { 'Echo-Header': 'put header' } };

        describe('(url) => Promise', () => {
            it('returns response data', async () => {
                const data = await services.put('/item');

                expect(data).to.eql(testItem);
            });
        });

        describe('(url, data) => Promise', () => {
            it('puts data', async () => {
                const data = await services.put('/echo', testPayload);

                expect(data).to.eql(testPayload);
            });
        });

        describe('(url, data, config) => Promise', () => {
            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            it('puts data', async () => {
                const data = await services.put('/echo', testPayload, testConfig);

                expect(data).to.eql(testPayload);
            });

            it('sends headers', async () => {
                const data = await services.put('/echoHeader', testPayload, testConfig);

                expect(data).to.eql('put header');
            });
        });

        describe('(url, cb)', () => {
            it('returns response data', (done) => {
                services.put(
                    '/item',
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testItem);
                    }),
                );
            });
        });

        describe('(url, data, cb)', () => {
            it('puts data', (done) => {
                services.put(
                    '/echo',
                    testPayload,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testPayload);
                    }),
                );
            });
        });

        describe('(url, data, config, cb)', () => {
            it('puts data', (done) => {
                services.put(
                    '/echo',
                    testPayload,
                    testConfig,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testPayload);
                    }),
                );
            });

            it('sends headers', (done) => {
                services.put(
                    '/echoHeader',
                    testPayload,
                    testConfig,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql('put header');
                    }),
                );
            });
        });
    });

    describe('#patch', () => {
        const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
        const testPayload = { test: 'patch data', context: '#patch' };
        const testConfig = { headers: { 'Echo-Header': 'patch header' } };

        describe('(url) => Promise', () => {
            it('returns response data', async () => {
                const data = await services.patch('/item');

                expect(data).to.eql(testItem);
            });
        });

        describe('(url, data) => Promise', () => {
            it('patches data', async () => {
                const data = await services.patch('/echo', testPayload);

                expect(data).to.eql(testPayload);
            });
        });

        describe('(url, data, config) => Promise', () => {
            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            it('patches data', async () => {
                const data = await services.patch('/echo', testPayload, testConfig);

                expect(data).to.eql(testPayload);
            });

            it('sends headers', async () => {
                const data = await services.patch('/echoHeader', testPayload, testConfig);

                expect(data).to.eql('patch header');
            });
        });

        describe('(url, cb)', () => {
            it('returns response data', (done) => {
                services.patch(
                    '/item',
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testItem);
                    }),
                );
            });
        });

        describe('(url, data, cb)', () => {
            it('patches data', (done) => {
                services.patch(
                    '/echo',
                    testPayload,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testPayload);
                    }),
                );
            });
        });

        describe('(url, data, config, cb)', () => {
            it('patches data', (done) => {
                services.patch(
                    '/echo',
                    testPayload,
                    testConfig,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testPayload);
                    }),
                );
            });

            it('sends headers', (done) => {
                services.patch(
                    '/echoHeader',
                    testPayload,
                    testConfig,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql('patch header');
                    }),
                );
            });
        });
    });

    describe('#delete', () => {
        const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
        const testConfig = { headers: { 'Echo-Header': 'delete header' } };

        describe('(url) => Promise', () => {
            it('returns response data', async () => {
                const data = await services.delete('/item');

                expect(data).to.eql(testItem);
            });
        });

        describe('(url, config) => Promise', () => {
            it('sends headers', async () => {
                const data = await services.delete('/echoHeader', testConfig);

                expect(data).to.eql('delete header');
            });
        });

        describe('(url, cb)', () => {
            it('returns response data', (done) => {
                services.delete(
                    '/item',
                    assertionCallback(done, (data) => {
                        expect(data).to.eql(testItem);
                    }),
                );
            });
        });

        describe('(url, config, cb)', () => {
            it('sends headers', (done) => {
                services.delete(
                    '/echoHeader',
                    testConfig,
                    assertionCallback(done, (data) => {
                        expect(data).to.eql('delete header');
                    }),
                );
            });
        });
    });
});

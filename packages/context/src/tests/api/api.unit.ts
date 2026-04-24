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

    describe('#get request caching', () => {
        // Each test uses a unique URL path to avoid cross-test cache contamination
        // since the inflight maps are module-level and persist across tests.

        it('concurrent requests to the same URL only make one network call', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/concurrent', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
            const [result1, result2] = await Promise.all([services.get('/concurrent'), services.get('/concurrent')]);

            expect(callCount).to.eql(1);
            expect(result1).to.eql(testItem);
            expect(result2).to.eql(testItem);
        });

        it('concurrent requests from different instances with the same baseURL share the in-flight request', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/concurrent-instances', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services1 = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
            const services2 = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
            const [result1, result2] = await Promise.all([
                services1.get('/concurrent-instances'),
                services2.get('/concurrent-instances'),
            ]);

            expect(callCount).to.eql(1);
            expect(result1).to.eql(testItem);
            expect(result2).to.eql(testItem);
        });

        it('reuses the resolved response within the TTL window', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/ttl-hit', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            await services.get('/ttl-hit');
            const result = await services.get('/ttl-hit');

            expect(callCount).to.eql(1);
            expect(result).to.eql(testItem);
        });

        it('makes a new request after the TTL expires', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/ttl-miss', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            await services.get('/ttl-miss');
            expect(callCount).to.eql(1);

            await new Promise((resolve) => setTimeout(resolve, 250));

            await services.get('/ttl-miss');
            expect(callCount).to.eql(2);
        });

        it('extends the TTL on each cache hit within the window (sliding window)', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/ttl-extend', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            await services.get('/ttl-extend');
            expect(callCount).to.eql(1);

            // Hit cache every 100ms — each hit resets the 200ms window
            await new Promise((resolve) => setTimeout(resolve, 100));
            await services.get('/ttl-extend');
            expect(callCount).to.eql(1);

            await new Promise((resolve) => setTimeout(resolve, 100));
            await services.get('/ttl-extend');
            expect(callCount).to.eql(1);

            // Now wait long enough for the TTL to expire (200ms after last hit)
            await new Promise((resolve) => setTimeout(resolve, 250));

            await services.get('/ttl-extend');
            expect(callCount).to.eql(2);
        });

        it('does not cache failed requests', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/fail', (req, res, ctx) => {
                    callCount++;

                    return callCount === 1 ? res(ctx.status(500)) : res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            try {
                await services.get('/fail');
            } catch {
                // expected
            }

            expect(callCount).to.eql(1);

            const result = await services.get('/fail');

            expect(callCount).to.eql(2);
            expect(result).to.eql(testItem);
        });

        it('does not share cache between different URLs', async () => {
            let url1Count = 0;
            let url2Count = 0;

            server.use(
                rest.get('http://localhost/cache-url1', (req, res, ctx) => {
                    url1Count++;

                    return res(ctx.json({ url: 1 }));
                }),
                rest.get('http://localhost/cache-url2', (req, res, ctx) => {
                    url2Count++;

                    return res(ctx.json({ url: 2 }));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            await Promise.all([services.get('/cache-url1'), services.get('/cache-url2')]);

            expect(url1Count).to.eql(1);
            expect(url2Count).to.eql(1);
        });

        it('does not share cache between requests with different params', async () => {
            let page1Count = 0;
            let page2Count = 0;

            server.use(
                rest.get('http://localhost/paged', (req, res, ctx) => {
                    const page = req.url.searchParams.get('page');

                    if (page === '1') page1Count++;
                    if (page === '2') page2Count++;

                    return res(ctx.json({ page }));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/', paramsSerializer }));

            await Promise.all([
                services.get('/paged', { params: { page: '1' } }),
                services.get('/paged', { params: { page: '2' } }),
            ]);

            expect(page1Count).to.eql(1);
            expect(page2Count).to.eql(1);
        });

        it('shares cache between concurrent requests with the same params', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/paged-shared', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/', paramsSerializer }));

            const [result1, result2] = await Promise.all([
                services.get('/paged-shared', { params: { page: '1' } }),
                services.get('/paged-shared', { params: { page: '1' } }),
            ]);

            expect(callCount).to.eql(1);
            expect(result1).to.eql(testItem);
            expect(result2).to.eql(testItem);
        });

        it('does not share cache between requests with different custom paramsSerializers', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/custom-serializer', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));

            await Promise.all([
                services.get('/custom-serializer', {
                    params: { page: '1' },
                    paramsSerializer: () => 'serializer=a',
                }),
                services.get('/custom-serializer', {
                    params: { page: '1' },
                    paramsSerializer: () => 'serializer=b',
                }),
            ]);

            expect(callCount).to.eql(2);
        });

        it('shares cache between concurrent requests with the same custom paramsSerializer output', async () => {
            let callCount = 0;

            server.use(
                rest.get('http://localhost/custom-serializer-shared', (req, res, ctx) => {
                    callCount++;

                    return res(ctx.json(testItem));
                }),
            );

            const services = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
            const customSerializer = () => 'page=1';

            const [result1, result2] = await Promise.all([
                services.get('/custom-serializer-shared', {
                    params: { page: '1' },
                    paramsSerializer: customSerializer,
                }),
                services.get('/custom-serializer-shared', {
                    params: { page: '1' },
                    paramsSerializer: customSerializer,
                }),
            ]);

            expect(callCount).to.eql(1);
            expect(result1).to.eql(testItem);
            expect(result2).to.eql(testItem);
        });

        it('does not share cache between different baseURLs', async () => {
            let host1Count = 0;
            let host2Count = 0;

            server.use(
                rest.get('http://localhost/same-path', (req, res, ctx) => {
                    host1Count++;

                    return res(ctx.json(testItem));
                }),
                rest.get('http://otherhost/same-path', (req, res, ctx) => {
                    host2Count++;

                    return res(ctx.json(testItem));
                }),
            );

            const services1 = new ApiServices(axios.create({ baseURL: 'http://localhost/' }));
            const services2 = new ApiServices(axios.create({ baseURL: 'http://otherhost/' }));

            await Promise.all([services1.get('/same-path'), services2.get('/same-path')]);

            expect(host1Count).to.eql(1);
            expect(host2Count).to.eql(1);
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

// Copyright (c) 2025 System Automation Corporation.
// This file is licensed under the MIT License.

import { render } from '@testing-library/react';
import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import 'global-jsdom/register';
import { App, AppProvider, Page, useApp, usePage } from '../../app/index.js';

chai.use(dirtyChai);

const testPages: Page[] = [
    { id: 'page-1', name: 'Page One', slug: 'page-one' },
    { id: 'page-2', name: 'Page Two', slug: 'page-two', children: [] },
];

const testApp: App = {
    id: 'app-1',
    name: 'Test App',
    type: 'private',
    pages: testPages,
};

describe('usePage', () => {
    it('returns the matching page when the app has a page with the given id', () => {
        let result: Page | undefined;

        const TestComponent = () => {
            result = usePage('page-1');
            return null;
        };

        render(
            <AppProvider app={testApp}>
                <TestComponent />
            </AppProvider>,
        );

        expect(result).to.eql(testPages[0]);
    });

    it('returns `undefined` when no page matches the given id', () => {
        let result: Page | undefined;

        const TestComponent = () => {
            result = usePage('unknown-id');
            return null;
        };

        render(
            <AppProvider app={testApp}>
                <TestComponent />
            </AppProvider>,
        );

        expect(result).to.be.undefined();
    });

    it('returns `undefined` when the app has an empty pages array', () => {
        let result: Page | undefined;

        const appWithEmptyPages: App = { id: 'app-2', name: 'App With No Pages', type: 'private', pages: [] };

        const TestComponent = () => {
            result = usePage('page-1');
            return null;
        };

        render(
            <AppProvider app={appWithEmptyPages}>
                <TestComponent />
            </AppProvider>,
        );

        expect(result).to.be.undefined();
    });

    it('returns `undefined` when the app has no pages property', () => {
        let result: Page | undefined;

        const appWithoutPages: App = { id: 'app-3', name: 'App Without Pages', type: 'private' };

        const TestComponent = () => {
            result = usePage('page-1');
            return null;
        };

        render(
            <AppProvider app={appWithoutPages}>
                <TestComponent />
            </AppProvider>,
        );

        expect(result).to.be.undefined();
    });

    it('returns `undefined` when called outside AppProvider', () => {
        let result: Page | undefined;

        const TestComponent = () => {
            result = usePage('page-1');
            return null;
        };

        render(<TestComponent />);

        expect(result).to.be.undefined();
    });
});

describe('findDefaultPageSlugFor', () => {
    const appWithDefaultPages: App = {
        id: 'app-1',
        name: 'Test App',
        type: 'private',
        pages: [
            { id: 'page-1', name: 'Page One', slug: 'page-one' },
            { id: 'page-2', name: 'Page Two', slug: 'page-two' },
            { id: 'page-no-slug', name: 'Page No Slug' },
        ],
        defaultPages: {
            'object-1': 'page-1',
            'object-2': 'page-no-slug',
        },
    };

    it('returns the full page URL when the object has a matching default page with a slug', async () => {
        let findDefaultPageSlugFor: ((id: string) => Promise<string | undefined>) | undefined;

        const TestComponent = () => {
            findDefaultPageSlugFor = useApp().findDefaultPageSlugFor;
            return null;
        };

        render(
            <AppProvider app={appWithDefaultPages}>
                <TestComponent />
            </AppProvider>,
        );

        const result = await findDefaultPageSlugFor!('object-1');

        expect(result).to.eql('/app-1/page-one');
    });

    it('strips the path prefix from the default page id before looking up the page', async () => {
        const appWithPathPrefix: App = {
            ...appWithDefaultPages,
            defaultPages: { 'object-1': '/app-1/page-1' },
        };

        let findDefaultPageSlugFor: ((id: string) => Promise<string | undefined>) | undefined;

        const TestComponent = () => {
            findDefaultPageSlugFor = useApp().findDefaultPageSlugFor;
            return null;
        };

        render(
            <AppProvider app={appWithPathPrefix}>
                <TestComponent />
            </AppProvider>,
        );

        const result = await findDefaultPageSlugFor!('object-1');

        expect(result).to.eql('/app-1/page-one');
    });

    it('returns `undefined` when the default page id does not match any page in the app', async () => {
        const appWithUnknownPage: App = {
            ...appWithDefaultPages,
            defaultPages: { 'object-1': 'non-existent-page' },
        };

        let findDefaultPageSlugFor: ((id: string) => Promise<string | undefined>) | undefined;

        const TestComponent = () => {
            findDefaultPageSlugFor = useApp().findDefaultPageSlugFor;
            return null;
        };

        render(
            <AppProvider app={appWithUnknownPage}>
                <TestComponent />
            </AppProvider>,
        );

        const result = await findDefaultPageSlugFor!('object-1');

        expect(result).to.be.undefined();
    });

    it('returns `undefined` when the matching default page has no slug', async () => {
        let findDefaultPageSlugFor: ((id: string) => Promise<string | undefined>) | undefined;

        const TestComponent = () => {
            findDefaultPageSlugFor = useApp().findDefaultPageSlugFor;
            return null;
        };

        render(
            <AppProvider app={appWithDefaultPages}>
                <TestComponent />
            </AppProvider>,
        );

        const result = await findDefaultPageSlugFor!('object-2');

        expect(result).to.be.undefined();
    });
});

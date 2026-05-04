// Copyright (c) 2025 System Automation Corporation.
// This file is licensed under the MIT License.

import { render } from '@testing-library/react';
import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import 'global-jsdom/register';
import { App, AppProvider, Page, usePage } from '../../app/index.js';

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

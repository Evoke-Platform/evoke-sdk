// Copyright (c) 2026 System Automation Corporation.
// This file is licensed under the MIT License.

import type { App } from './AppProvider.js';

/**
 * Splits a saved default page into its app and page IDs. Values saved as `/${appId}/${pageId}` name their
 * app; older values hold only a page ID in the current app.
 *
 * @param {string} defaultPage - The saved default page value.
 * @param {string} currentAppId - The ID of the app the setting belongs to.
 * @returns {{ appId: string; pageId: string }} The app and page the value points to.
 */
export function parseDefaultPage(defaultPage: string, currentAppId: string): { appId: string; pageId: string } {
    if (!defaultPage.startsWith('/')) {
        return { appId: currentAppId, pageId: defaultPage };
    }

    const [, appId, ...pagePath] = defaultPage.split('/');

    return { appId, pageId: pagePath.join('/') };
}

/**
 * Builds the request for the other apps that an app's default pages point to, with their page summaries.
 * Shell's offline warm-up sends this exact URL so the service worker can serve it offline.
 *
 * @param {Pick<App, 'id' | 'defaultPages'>} app - The app whose default pages are checked.
 * @returns {string | undefined} A URL relative to the API root, or `undefined` when every default page is in
 * this app.
 */
export function getDefaultPageAppsUrl(app: Pick<App, 'id' | 'defaultPages'>): string | undefined {
    const appIds = [
        ...new Set(Object.values(app.defaultPages ?? {}).map((page) => parseDefaultPage(page, app.id).appId)),
    ]
        .filter((appId) => appId && appId !== app.id)
        .sort();

    if (!appIds.length) {
        return undefined;
    }

    const params = new URLSearchParams({
        pages: 'summary',
        filter: JSON.stringify({ where: { id: { inq: appIds } } }),
    });

    return `webContent/apps?${params.toString()}`;
}

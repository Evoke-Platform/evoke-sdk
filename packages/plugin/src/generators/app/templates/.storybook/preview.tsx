import type { Decorator, Preview } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { MemoryRouter } from 'react-router-dom';
import { resetRequestLog } from '../src/mocks/evokeHandlers';

// Intercept the widget's Evoke API calls at the network boundary. 'error' fails the
// story when any endpoint lacks a handler — add one in src/mocks/ to fix the failure.
initialize({ onUnhandledRequest: 'error' });

// There is deliberately no theme decorator here. `UIThemeProvider` is only a default
// export of @evoke-platform/ui-components' theme subpath, and that subpath is not in the
// package's `exports` map, so there is no supported way to import it — a named import
// resolves to `undefined` and every story crashes. SDK components that need the theme
// (Select, DataGrid, FormRendererContainer, ...) mount `UIThemeProvider` themselves, so
// stories still render with the right tokens. Do not "fix" this by deep-importing it.

// SDK components (e.g. FormRendererContainer) call router hooks; App Viewer
// provides the router at runtime, MemoryRouter stands in for it here.
const withRouter: Decorator = (Story) => (
    <MemoryRouter>
        <Story />
    </MemoryRouter>
);

// Loaders run per story before render, so the log starts empty for every story without
// each play function having to remember to clear it.
const resetLoader = () => {
    resetRequestLog();

    return {};
};

const preview: Preview = {
    loaders: [mswLoader, resetLoader],
    decorators: [withRouter],
    parameters: {
        actions: { argTypesRegex: '^on[A-Z].*' },
        options: {
            // Storybook opens on the first story in the sidebar. A widget's Playground
            // story shows the whole widget over its mocks, so it makes a better landing
            // spot for reviewers than an alphabetically-first component fragment.
            //
            // Keep this function free of TypeScript annotations. Storybook builds the
            // story index by statically re-parsing this block as plain JavaScript, so a
            // type annotation here fails that parse: /index.json returns 500 and
            // `test-storybook` finds zero stories, with nothing naming this file.
            storySort: (a, b) => {
                const rank = (id) => (/playground/i.test(id) ? 0 : 1);
                const diff = rank(a.id) - rank(b.id);

                return diff !== 0 ? diff : a.id.localeCompare(b.id, undefined, { numeric: true });
            },
        },
        // Widgets render on light surfaces in App Viewer; keep the preview consistent
        // regardless of the OS color scheme.
        backgrounds: { default: 'light' },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/,
            },
        },
    },
};

export default preview;

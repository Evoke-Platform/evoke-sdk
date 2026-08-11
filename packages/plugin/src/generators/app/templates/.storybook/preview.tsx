import { UIThemeProvider, defaultTheme } from '@evoke-platform/ui-components';
import type { Decorator, Preview } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { MemoryRouter } from 'react-router-dom';

// Intercept the widget's Evoke API calls at the network boundary. 'error' fails the
// story when any endpoint lacks a handler — add one in src/mocks/ to fix the failure.
initialize({ onUnhandledRequest: 'error' });

// App Viewer renders widgets inside the Evoke theme; UIThemeProvider stands in for it
// here so SDK components pick up the same tokens they will at runtime.
const withTheme: Decorator = (Story) => (
    <UIThemeProvider theme={defaultTheme}>
        <Story />
    </UIThemeProvider>
);

// SDK components (e.g. FormRendererContainer) call router hooks; App Viewer
// provides the router at runtime, MemoryRouter stands in for it here.
const withRouter: Decorator = (Story) => (
    <MemoryRouter>
        <Story />
    </MemoryRouter>
);

const preview: Preview = {
    loaders: [mswLoader],
    decorators: [withTheme, withRouter],
    parameters: {
        actions: { argTypesRegex: '^on[A-Z].*' },
        options: {
            // Storybook opens on the first story in the sidebar. A widget's Playground
            // story shows the whole widget over its mocks, so it makes a better landing
            // spot for reviewers than an alphabetically-first component fragment.
            storySort: (a: { id: string }, b: { id: string }) => {
                const rank = (id: string) => (/playground/i.test(id) ? 0 : 1);
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

import type { Preview } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import { MemoryRouter } from 'react-router-dom';

// Intercept the widget's Evoke API calls at the network boundary. 'error' fails the
// story when any endpoint lacks a handler — add one in src/mocks/ to fix the failure.
initialize({ onUnhandledRequest: 'error' });

const preview: Preview = {
    loaders: [mswLoader],
    decorators: [
        // SDK components (e.g. FormRendererContainer) call router hooks; App Viewer
        // provides the router at runtime, MemoryRouter stands in for it here.
        (Story) => (
            <MemoryRouter>
                <Story />
            </MemoryRouter>
        ),
    ],
    parameters: {
        actions: { argTypesRegex: '^on[A-Z].*' },
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

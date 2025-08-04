import type { Preview } from '@storybook/react';
import { initialize, mswLoader } from 'storybook-msw-addon';

// ✅ Initialize MSW (starts the worker)
initialize({
    onUnhandledRequest: 'warn',
});

// ✅ Provide MSW loader globally (ensures handlers are ready before stories render)
export const loaders = [mswLoader];

const preview: Preview = {
    parameters: {
        msw: {
            handlers: [], // stories can override this
        },
        actions: { argTypesRegex: '^on[A-Z].*' },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/,
            },
        },
    },
};

export default preview;

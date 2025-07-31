import type { Preview } from '@storybook/react';
import { worker } from '../src/mocks/browser'; // Import the worker setup

// Start the worker and expose it globally
worker.start({ onUnhandledRequest: 'warn' }).then(() => {
    (window as any).msw = { worker };
    console.log('[MSW] Worker started and exposed globally');
});

const preview: Preview = {
    parameters: {
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

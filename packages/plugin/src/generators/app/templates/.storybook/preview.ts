import { UIThemeProvider, defaultTheme } from '@evoke-platform/ui-components';
import type { Decorator, Preview } from '@storybook/react';
import React from 'react';

const withTheme: Decorator = (Story) =>
    React.createElement(UIThemeProvider, { theme: defaultTheme }, React.createElement(Story));

const preview: Preview = {
    decorators: [withTheme],
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

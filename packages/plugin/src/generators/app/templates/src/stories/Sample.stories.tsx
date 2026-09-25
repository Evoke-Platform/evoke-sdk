import { expect } from '@storybook/jest';
import type { Meta, StoryObj } from '@storybook/react';
import { within } from '@storybook/testing-library';

import SampleWidget from '../widgets/SampleWidget';

// More on how to set up stories at: https://storybook.js.org/docs/7.0/react/writing-stories/introduction
const meta = {
    title: 'Example/SampleWidget',
    component: SampleWidget,
    argTypes: {
        message: { control: 'text' },
    },
    args: {
        message: 'Sample Story 1',
    },
} satisfies Meta<typeof SampleWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/7.0/react/writing-stories/args

// The play function runs after the story renders. Its steps and assertions appear in
// Storybook's Interactions panel — red until the component satisfies them, green after.
// Write the play function FIRST, watch it fail, then implement: see the storybook-tdd
// skill for the full red-green workflow.
export const SampleStory1: Story = {
    render: (args) => <SampleWidget {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Sample Story 1')).toBeInTheDocument();
    },
};

export const SampleStory2: Story = {
    render: () => <SampleWidget message="Sample Story 2" />,
};

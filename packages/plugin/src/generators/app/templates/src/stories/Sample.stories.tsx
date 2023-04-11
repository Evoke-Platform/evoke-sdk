import type { Meta, StoryObj } from '@storybook/react';

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

export const SampleStory1: Story = {
    render: (args) => <SampleWidget {...args} />,
};

export const SampleStory2: Story = {
    render: () => <SampleWidget message="Sample Story 2" />,
};

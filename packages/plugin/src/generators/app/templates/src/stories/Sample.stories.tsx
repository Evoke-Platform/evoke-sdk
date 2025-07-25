// src/stories/SampleWidget.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { MockDefinition, WithMockApi } from '../../.storybook/withMockApi';
import SampleWidget from '../widgets/SampleWidget';

type SampleWidgetStoryArgs = React.ComponentProps<typeof SampleWidget> & {
    mocks: MockDefinition[];
};

const meta: Meta<SampleWidgetStoryArgs> = {
    title: 'Widgets/SampleWidget',
    component: SampleWidget,
    tags: ['autodocs'],
    argTypes: {
        mocks: {
            control: 'object',
            table: { category: 'Mock Config' },
            description: 'Array of mock definitions to apply to the widget',
        },
        message: { control: 'text' },
    },
    // Default args for the story with multiple API mocks
    args: {
        mocks: [
            {
                method: 'GET',
                endpoint: '/api/test',
                response: { message: 'Mock 1' },
                status: 200,
            },
            {
                method: 'POST',
                endpoint: '/api/out',
                response: { success: true },
                status: 200,
            },
        ],
        message: 'Testing multiple mocks',
    },
};
export default meta;

type Story = StoryObj<SampleWidgetStoryArgs>;

export const DynamicWithMultipleMocks: Story = {
    render: (args) => {
        const [mockState, setMockState] = useState<MockDefinition[]>(args.mocks);
        const { message } = args;

        useEffect(() => {
            setMockState(args.mocks);
        }, [args.mocks]);
        return (
            <>
                <WithMockApi mocks={mockState}>
                    <SampleWidget message={message} />
                </WithMockApi>
            </>
        );
    },
};


import type {Meta, StoryObj} from '@storybook/react';
import {http, HttpResponse} from 'msw';
import SampleWidget from '../widgets/SampleWidget';

const meta: Meta<typeof SampleWidget> = {
    component: SampleWidget,
    parameters: {
        msw: {
            handlers: [
                http.get(`${window.location.origin}/api/test`, () => {
                    return HttpResponse.json({message: 'Hello from mock!'});
                }),
                http.post(`${window.location.origin}/api/out`, () => {
                    return HttpResponse.json({status: 'posted'});
                }),
            ],
        },
    },
};

export default meta;
type Story = StoryObj<typeof SampleWidget>;

export const Primary: Story = {
    args: {
        message: 'Using MSW Addon!',
    },
};

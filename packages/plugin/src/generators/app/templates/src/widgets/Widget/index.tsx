import { declareWidget } from '@evoke-platform/sdk';

export type WidgetProps = {
    message?: string;
};

const Widget = (props: WidgetProps) => {
    return <div>{props.message || 'This is a sample widget'}</div>;
};

// Define metadata for the widget.  This must be done in the module that
// exports the widget.
declareWidget(Widget, {
    name: 'Sample Widget',
    description: 'Description of the Sample Widget',
    properties: {
        message: {
            name: 'Message',
            type: 'string',
            isOptional: true,
        },
    },
});

// Widget must be default export.
export default Widget;

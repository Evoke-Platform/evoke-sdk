export type WidgetProps = {
    message?: string;
};

const SampleWidget = (props: WidgetProps) => {
    return <div>{props.message || 'This is a sample widget'}</div>;
};

export default SampleWidget;

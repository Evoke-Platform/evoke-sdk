export type WidgetProps = {
    message?: string;
};

const Widget = (props: WidgetProps) => {
    return <div>{props.message || 'This is a sample widget'}</div>;
};

export default Widget;

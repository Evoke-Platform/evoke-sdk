import { useApiServices } from '@evoke-platform/context';
import { useEffect, useState } from 'react';
export type WidgetProps = {
    message?: string;
};

const SampleWidget = (props: WidgetProps) => {
    const api = useApiServices();
    const [data, setData] = useState({});

    // Example API calls using the evoke Api Service
    useEffect(() => {
        api.get<object>('/test').then((response) => {
            console.log('API Response:', response);
            setData(response);
        });
        api.post<object>('/out', { data: 'Sample' }).then((response) => {
            console.log('POST Response:', response);
        });
    }, []);

    return (
        <div>
            {props.message || 'This is a sample widget'}
            {data && <div>Data from API: {JSON.stringify(data)}</div>}
        </div>
    );
};

export default SampleWidget;

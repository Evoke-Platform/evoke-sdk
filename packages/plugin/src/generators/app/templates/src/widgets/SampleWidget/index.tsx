import {ApiServices, useApiServices} from '@evoke-platform/context';
import React, {useState} from 'react';

// Extracted styles for better readability
const styles = {
    button: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        boxShadow: '0 2px 4px rgba(0, 123, 255, 0.3)',
    } as React.CSSProperties,

    container: {
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    } as React.CSSProperties,

    title: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '20px',
        textAlign: 'center',
    } as React.CSSProperties,

    dataDisplay: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        fontSize: '16px',
        fontWeight: '500',
        color: '#495057',
        lineHeight: '1.5',
        wordBreak: 'break-word',
    } as React.CSSProperties,

    buttonContainer: {
        textAlign: 'center',
        marginTop: '24px',
    } as React.CSSProperties,

    jsonPre: {
        margin: '8px 0 0 0',
        fontSize: '14px',
    } as React.CSSProperties,
};

type SimpleButtonProps = {
    api: ApiServices;
    setData: React.Dispatch<React.SetStateAction<object>>;
};

export const SimpleButton = ({api, setData}: SimpleButtonProps) => {
    const handleClick = () => {
        api.get<object>('/test').then((response) => {
            console.log('API Response:', response);
            setData(response);
        });

        api.post<object>('/out', {data: 'Sample'}).then((response) => {
            console.log('POST Response:', response);
        });
    };

    return (
        <button
            onClick={handleClick}
            style={styles.button}
        >
            Click Me
        </button>
    );
};

export type WidgetProps = {
    message?: string;
};

const SampleWidget = (props: WidgetProps) => {
    const api = useApiServices();
    const [data, setData] = useState<object>({});

    return (
        <div style={styles.container}>
            <div style={styles.title}>
                {props.message}
            </div>
            {data && Object.keys(data).length > 0 && (
                <div style={styles.dataDisplay}>
                    <strong>Data from API:</strong>
                    <pre style={styles.jsonPre}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
            <div style={styles.buttonContainer}>
                <SimpleButton api={api} setData={setData} />
            </div>
        </div>
    );
};

export default SampleWidget;

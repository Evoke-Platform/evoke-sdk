import { ApiServices, useApiServices } from '@evoke-platform/context';
import { Box, Button } from '@mui/material';
import React, { useState } from 'react';

type SimpleButtonProps = {
    api: ApiServices;
    setData: React.Dispatch<React.SetStateAction<object>>;
};

export const SimpleButton = ({ api, setData }: SimpleButtonProps) => {
    const handleClick = () => {
        api.get<object>('/test').then((response) => {
            console.log('API Response:', response);
            setData(response);
        });

        api.post<object>('/out', { data: 'Sample' }).then((response) => {
            console.log('POST Response:', response);
        });
    };

    return (
        <Button
            onClick={handleClick}
            variant="contained"
            sx={{
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                textTransform: 'none',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.3)',
                '&:hover': {
                    backgroundColor: '#0056b3',
                },
            }}
        >
            Click Me
        </Button>
    );
};

export type WidgetProps = {
    message?: string;
};

const SampleWidget = (props: WidgetProps) => {
    const api = useApiServices();
    const [data, setData] = useState<object>({});

    return (
        <Box
            sx={{
                padding: '24px',
                maxWidth: '600px',
                margin: '0 auto',
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
        >
            <Box
                sx={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '20px',
                    textAlign: 'center',
                }}
            >
                {props.message}
            </Box>
            {data && Object.keys(data).length > 0 && (
                <Box
                    sx={{
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
                    }}
                >
                    <strong>Data from API:</strong>
                    <Box
                        component="pre"
                        sx={{
                            margin: '8px 0 0 0',
                            fontSize: '14px',
                        }}
                    >
                        {JSON.stringify(data, null, 2)}
                    </Box>
                </Box>
            )}
            <Box
                sx={{
                    textAlign: 'center',
                    marginTop: '24px',
                }}
            >
                <SimpleButton api={api} setData={setData} />
            </Box>
        </Box>
    );
};

export default SampleWidget;

import { http, HttpResponse } from 'msw';
import React, { useEffect, useState } from 'react';

export type MockDefinition = {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    endpoint: string;
    response: Record<string, unknown>;
    status?: number;
    delayMs?: number;
};

export type WithApiProps = {
    mocks: MockDefinition[];
    children: React.ReactElement;
};

export const WithMockApi = ({ mocks, children }: WithApiProps) => {
    const [key, setKey] = useState('initial');

    useEffect(() => {
        const worker = (window as any).msw?.worker;
        if (!worker) {
            console.warn('[WithRemount] MSW worker not found on window');
            return;
        }

        const handlers = mocks.map((mock) => {
            const fullUrl = `${window.location.origin}${mock.endpoint}`;
            const method = mock.method.toLowerCase() as keyof typeof http;

            return http[method](fullUrl, async () => {
                if (mock.delayMs) await new Promise((res) => setTimeout(res, mock.delayMs));
                return HttpResponse.json(mock.response, { status: mock.status ?? 200 });
            });
        });

        console.log('[WithRemount] Registering handlers:', mocks);
        worker.resetHandlers(...handlers);
    }, [JSON.stringify(mocks)]);

    useEffect(() => {
        const newKey = mocks
            .map((m) => `${m.method}-${m.endpoint}-${m.status}-${JSON.stringify(m.response)}`)
            .join('|');
        setKey(newKey);
    }, [JSON.stringify(mocks)]);

    return React.cloneElement(children, { key });
};

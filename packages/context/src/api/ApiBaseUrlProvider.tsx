// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { createContext, ReactNode, useContext } from 'react';

const ApiBaseUrlContext = createContext(`${globalThis.location?.origin}/api`);

ApiBaseUrlContext.displayName = 'ApiBaseUrlContext';

export type ApiBaseUrlProviderProps = {
    url: string;
    children?: ReactNode;
};

function ApiBaseUrlProvider(props: ApiBaseUrlProviderProps) {
    const { url, children } = props;

    return <ApiBaseUrlContext.Provider value={url}>{children}</ApiBaseUrlContext.Provider>;
}

export function useApiBaseUrl() {
    return useContext(ApiBaseUrlContext);
}

export default ApiBaseUrlProvider;

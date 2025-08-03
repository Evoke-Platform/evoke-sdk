// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { useParams, useSearchParams } from 'react-router-dom';

export function usePageParams() {
    return useParams();
}

export function usePageParam(param: string) {
    return useParams()[param];
}

export function usePageSearchParams() {
    return useSearchParams();
}

export function usePageSearchParam(param: string) {
    const [searchParams] = usePageSearchParams();
    return searchParams.get(param);
}

// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { useParams } from 'react-router-dom';

export function usePageParams() {
    return useParams();
}

export function usePageParam(param: string) {
    return useParams()[param];
}

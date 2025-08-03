// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { useCallback } from 'react';
import { createSearchParams, generatePath, useNavigate as useRouterNavigate } from 'react-router-dom';

export type NavigateFunction = (page: string, params?: Record<string, string>) => void;

export function useNavigate(): NavigateFunction {
    const navigate = useRouterNavigate();

    return useCallback(
        (page: string, params?: Record<string, string>, searchParams?: Record<string, string>) => {
            navigate({
                pathname: generatePath(page, params),
                search: searchParams ? `?${createSearchParams(searchParams)}` : undefined,
            });
        },
        [navigate],
    );
}

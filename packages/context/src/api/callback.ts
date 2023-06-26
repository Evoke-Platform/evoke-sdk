// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type Callback<T> = (error?: Error | null, result?: T) => void;

export function callback<T>(onSuccess?: (result: T) => void, onError?: (err: Error) => void): Callback<T> {
    return (err?: Error | null, result?: T) => {
        if (err) {
            onError?.(err);
        } else {
            onSuccess?.(result as T);
        }
    };
}

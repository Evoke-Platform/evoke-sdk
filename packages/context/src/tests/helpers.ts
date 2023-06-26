// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { Done } from 'mocha';

export function assertionCallback(done: Done, fn: (data: unknown) => void) {
    return function (err?: Error | null, data?: unknown) {
        if (err) {
            done(err);
        } else {
            try {
                fn(data);
                done();
            } catch (err2) {
                done(err2);
            }
        }
    };
}

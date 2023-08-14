// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import { glob } from 'glob';
import { keyBy } from 'lodash';
import ts from 'typescript';
import { ItemDescriptor } from './descriptors';
import { FileScanner } from './fileScanner';

export type ScannerOptions = {
    defaultVersion?: string;
};

export class Scanner {
    constructor(private sourceRoot: string, private options?: ScannerOptions) {}

    async scan() {
        const files = await glob(`${this.sourceRoot}/**/*.{ts,tsx}`);
        const widgets: ItemDescriptor[] = [];
        const paymentGateways: ItemDescriptor[] = [];
        const program = ts.createProgram(files, {});

        for (const file of files) {
            const fileScanner = new FileScanner(program, file, this.options);
            const widget = fileScanner.scanForWidget();

            if (widget) {
                widgets.push(widget);
            }

            paymentGateways.push(...fileScanner.scanForPaymentGateways());
        }

        return {
            widgets: keyBy(widgets, (widget) => widget.id),
            paymentGateways: keyBy(paymentGateways, (gateway) => gateway.id),
        };
    }
}

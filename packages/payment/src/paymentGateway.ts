// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

import type { Request, Response } from 'express';
import { Payment } from './payment';

export interface ParsedQueryString {
    [key: string]: undefined | string | string[] | ParsedQueryString | ParsedQueryString[];
}

export interface TransferData {
    method: 'GET' | 'POST';
    url: string;
    parameters: Record<string, string>;
}

export type { Request, Response } from 'express';

export interface PaymentGateway {
    prepare(payment: Payment, returnUrl: string): TransferData | PromiseLike<TransferData>;
    postPaymentResult(payment: Payment, resultData: ParsedQueryString): Payment | null | PromiseLike<Payment | null>;
    receivePaymentNotification?(request: Request, response: Response): Payment | null | PromiseLike<Payment | null>;
}

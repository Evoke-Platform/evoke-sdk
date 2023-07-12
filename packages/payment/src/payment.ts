// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type PaymentStatus = 'NotStarted' | 'InProgress' | 'Cancelled' | 'Declined' | 'Paid';

export type PaymentMethod = 'CreditCard' | 'eCheck' | 'Cash' | 'Check';

export type CreditCardType = 'Visa' | 'Mastercard' | 'Discover' | 'AmericanExpress';

export interface Payment {
    id: string;

    /**
     * User initiating the payment transaction.
     */
    userId: string;

    status: PaymentStatus;
    contextObjectId?: string;
    contextInstanceId?: string;

    /**
     * Timestamp when the payment transaction was started in ISO date time format.
     */
    transactionStart?: string;

    /**
     * Timestamp when the payment transaction was completed in ISO date time
     * format.
     */
    transactionEnd?: string;

    customField1?: string;
    customField2?: string;
    customField3?: string;
    customField4?: string;
    customField5?: string;
    customField6?: string;
    customField7?: string;
    customField8?: string;
    customField9?: string;
    customField10?: string;

    paymentMethod?: PaymentMethod;
    cardType?: CreditCardType;
    amountPaid?: number;
}

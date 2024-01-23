// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export type PaymentStatus = 'NotStarted' | 'InProgress' | 'Cancelled' | 'Declined' | 'Paid';

export type PaymentMethod = 'CreditCard' | 'eCheck' | 'Cash' | 'Check';

export type CreditCardType = 'Visa' | 'Mastercard' | 'Discover' | 'AmericanExpress';

export type PaymentReference = { id: string; name: string };

export interface PaymentItem {
    id: string;

    /**
     * Description of the payment item.
     */
    name: string;

    contextObjectId?: string;
    contextInstanceId?: string;

    quantity: number;
    unitPrice: number;
    sku: string;

    /**
     * Total amount for the item based on the quantity and unit price.
     */
    totalAmount?: number;

    /**
     * Refernce to the payment that this item is associated with.
     */
    payment?: PaymentReference;

    customField1?: string;
    customField2?: string;
    customField3?: string;
    customField4?: string;
    customField5?: string;
}

export interface Payment {
    id: string;

    /**
     * Payment number associated with the transaction.
     */
    name: string;

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

    /**
     * Total fees associated with the payment based on the payment items.
     */
    feeTotal?: number;

    paymentItems?: PaymentItem[];

    appId?: string;
    successPage?: string;
    cancelPage?: string;

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

    // Below fields store the payment result.
    method?: PaymentMethod;
    cardType?: CreditCardType;
    amountPaid?: number;

    /**
     * Name of the person paying for the transaction.
     */
    payer?: string;

    gatewayTransactionId?: string;
    gatewayResultCode?: string;
    gatewayResultMessage?: string;
    authorizationCode?: string;
}

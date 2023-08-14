// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

export {};

/////////////////////////////////////////////////////////////////////////////
// NOTE:
// Remove above export and uncomment below to enable the sample payment gateway.
/////////////////////////////////////////////////////////////////////////////

// import { ParsedQueryString, Payment, PaymentGateway, TransferData } from '@evoke-platform/sdk';

// export type SampleGatewayProps = {
//     /** @propertyName Configurable Property 1 */
//     configurableProp1: string;

//     /** @propertyName Configurable Property 2 */
//     configurableProp2: string;
// };

// /**
//  * This is a skeleton gateway.
//  *
//  * @paymentGateway
//  */
// export class SampleGateway implements PaymentGateway {
//     constructor(private props: SampleGatewayProps) {}

//     prepare(payment: Payment, returnUrl: string): TransferData | PromiseLike<TransferData> {
//         throw new Error('Method not implemented.');
//     }

//     postPaymentResult(payment: Payment, resultData: ParsedQueryString): Payment | PromiseLike<Payment | null> | null {
//         throw new Error('Method not implemented.');
//     }
// }

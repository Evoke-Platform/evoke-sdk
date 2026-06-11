---
name: add-payment-gateway
description: Structural scaffold for a new payment gateway — file layout, PaymentGateway class skeleton, JSDoc annotations, and registration. Type signatures only; business logic comes from current provider docs with human review.
---

# Add a Payment Gateway

This skill provides structure only. Provider-specific logic — request signing, HMAC,
webhook verification — must be written from the provider's current documentation and
reviewed by a human. Run the plan-payment-gateway skill first.

## Files

-   `src/paymentGateways/<gatewayName>.ts` — the gateway class
-   `src/paymentGateways/index.ts` — add `export * from './<gatewayName>';`

## Skeleton

```ts
import { ParsedQueryString, Payment, PaymentGateway, Request, Response, TransferData } from '@evoke-platform/sdk';

export type MyGatewayProps = {
    /** @propertyName API Key */
    apiKey: string;

    /** @propertyName Merchant ID */
    merchantId: string;
};

/**
 * Gateway for <provider>.
 *
 * @paymentGateway
 */
export class MyGateway implements PaymentGateway {
    constructor(private props: MyGatewayProps) {}

    prepare(payment: Payment, returnUrl: string): TransferData | PromiseLike<TransferData> {
        throw new Error('Method not implemented.');
    }

    postPaymentResult(payment: Payment, resultData: ParsedQueryString): Payment | null | PromiseLike<Payment | null> {
        throw new Error('Method not implemented.');
    }

    receivePaymentNotification(request: Request, response: Response): Payment | null | PromiseLike<Payment | null> {
        throw new Error('Method not implemented.');
    }
}
```

Notes:

-   The `@paymentGateway` JSDoc tag is required — `manifestgen` discovers gateways by it.
    `@paymentGatewayName` optionally sets a display name.
-   Constructor props annotated with `@propertyName` become settings configured in the
    Evoke environment.
-   `receivePaymentNotification` is optional in the `PaymentGateway` interface; omit it if
    the provider has no asynchronous notifications.
-   `prepare` returns `TransferData` (`method`, `url`, `parameters`) describing the
    hosted-payment redirect.

## Payment Result Fields

`postPaymentResult` returns the updated `Payment` — Evoke records whatever fields are set
on it as the official transaction outcome. `status` is required on the `Payment`, but most
result-detail fields are optional in TypeScript; an implementation that compiles but never
sets `gatewayTransactionId` produces payment records that cannot be reconciled against the
processor's books. Populate every field the provider's response supplies:

| Field                  | Type                                                          | Set to                                                          |
| ---------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `status`               | `'NotStarted' \| 'InProgress' \| 'Cancelled' \| 'Declined' \| 'Paid'` | `'Paid'` on success, `'Declined'` on failure, `'Cancelled'` if the user backed out |
| `amountPaid`           | `number`                                                      | amount actually processed                                        |
| `gatewayTransactionId` | `string`                                                      | processor's transaction reference — essential for reconciliation |
| `gatewayResultCode`    | `string`                                                      | processor's status code                                          |
| `gatewayResultMessage` | `string`                                                      | processor's human-readable status                                |
| `method`               | `'CreditCard' \| 'eCheck' \| 'Cash' \| 'Check'`               | payment instrument used                                          |
| `cardType`             | `'Visa' \| 'Mastercard' \| 'Discover' \| 'AmericanExpress'`   | card network, if credit card                                     |
| `payer`                | `string`                                                      | name on the payment instrument                                   |
| `authorizationCode`    | `string`                                                      | authorization code, if the provider returns one                  |
| `transactionEnd`       | `string` (ISO date time)                                      | when the result was received                                     |

These fields are defined on the `Payment` interface in `@evoke-platform/sdk` — treat that
type as the source of truth. Inspect the installed declarations for the exact current
shapes:

-   `node_modules/@evoke-platform/payment/dist/payment.d.ts`
-   `node_modules/@evoke-platform/payment/dist/paymentGateway.d.ts`

## What NOT to Generate

Do not generate gateway-specific API implementations, HMAC/signature code, or webhook
verification logic from memory. Provider APIs change; that code must come from the
provider's current docs and be reviewed by a human before production use.

## Verify

Run `npm run build` and confirm the gateway appears in `dist/manifest.json` under
`paymentGateways`. Packaging output is `target/plugin.zip` via `npm run package`.

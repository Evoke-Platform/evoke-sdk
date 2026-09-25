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

    // UNTRUSTED INPUT. resultData is the query string on the browser's return trip, so
    // anyone can type it by hand. Authenticate it against the provider before treating
    // any of it as a result. See "Authenticating the two inbound methods" below.
    postPaymentResult(payment: Payment, resultData: ParsedQueryString): Payment | null | PromiseLike<Payment | null> {
        throw new Error('Method not implemented.');
    }

    // UNTRUSTED INPUT. This endpoint is reachable by anyone who learns its URL, not only
    // by the provider. Authenticate it using the provider's documented mechanism.
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

## Authenticating the Two Inbound Methods

`postPaymentResult` and `receivePaymentNotification` both receive data from outside the
application, and neither arrives authenticated. `postPaymentResult` reads the query string
on the browser's return trip from the hosted payment page, which the payer can edit before
loading the URL. `receivePaymentNotification` is an endpoint anyone who learns its address
can post to. **Neither input proves a payment happened.** Treating either as trustworthy
lets anyone mark an unpaid transaction as `Paid`.

Every gateway must therefore confirm the result with the provider before recording it.
How varies by provider, and the provider's current documentation is the only correct
source. The two usual mechanisms:

-   **Verify a signature or message authentication code** over the raw payload, using a
    shared secret from the gateway's configured properties. Compare digests in constant
    time, and verify against the raw bytes before any parsing.
-   **Ask the provider directly.** Ignore the amount and status in the inbound message,
    call the provider's transaction lookup with the identifier it supplied, and use that
    response as the result.

Then check the result belongs to this payment: the transaction matches the `Payment` you
were handed, the amount equals the amount owed, and the same notification replayed later
does not record a second payment.

If verification fails, do not update the `Payment`. Return `null` and let the transaction
stay unpaid.

## Payment Result Fields

Only populate these once the result is authenticated as described above. Everything below
assumes you have already confirmed the message came from the provider.

`postPaymentResult` returns the updated `Payment` — Evoke records whatever fields are set
on it as the official transaction outcome. `status` is required on the `Payment`, but most
result-detail fields are optional in TypeScript; an implementation that compiles but never
sets `gatewayTransactionId` produces payment records that cannot be reconciled against the
processor's books. Populate every field the provider's response supplies:

| Field                  | Type                                                                  | Set to                                                                             |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `status`               | `'NotStarted' \| 'InProgress' \| 'Cancelled' \| 'Declined' \| 'Paid'` | `'Paid'` on success, `'Declined'` on failure, `'Cancelled'` if the user backed out |
| `amountPaid`           | `number`                                                              | amount actually processed                                                          |
| `gatewayTransactionId` | `string`                                                              | processor's transaction reference — essential for reconciliation                   |
| `gatewayResultCode`    | `string`                                                              | processor's status code                                                            |
| `gatewayResultMessage` | `string`                                                              | processor's human-readable status                                                  |
| `method`               | `'CreditCard' \| 'eCheck' \| 'Cash' \| 'Check'`                       | payment instrument used                                                            |
| `cardType`             | `'Visa' \| 'Mastercard' \| 'Discover' \| 'AmericanExpress'`           | card network, if credit card                                                       |
| `payer`                | `string`                                                              | name on the payment instrument                                                     |
| `authorizationCode`    | `string`                                                              | authorization code, if the provider returns one                                    |
| `transactionEnd`       | `string` (ISO date time)                                              | when the result was received                                                       |

These fields are defined on `Payment`, re-exported by `@evoke-platform/sdk` from
`@evoke-platform/payment`. Read that installed npm package's exported `Payment` and
`PaymentGateway` types for the current shapes.

## What NOT to Generate

Do not generate gateway-specific API implementations, HMAC/signature code, or webhook
verification logic from memory. Provider APIs change; that code must come from the
provider's current docs and be reviewed by a human before production use.

This is about where that code comes from, not whether it is needed. Authentication is
required, as described above. If you cannot write it from the provider's documentation,
leave the method throwing and say so, rather than shipping one that records a payment it
never verified.

## Verify

Run `npm run build` and confirm the gateway appears in `dist/manifest.json` under
`paymentGateways`. Packaging output is `target/plugin.zip` via `npm run package`.

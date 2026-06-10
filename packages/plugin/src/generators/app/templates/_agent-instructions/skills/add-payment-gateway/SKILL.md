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

## What NOT to Generate

Do not generate gateway-specific API implementations, HMAC/signature code, or webhook
verification logic from memory. Provider APIs change; that code must come from the
provider's current docs and be reviewed by a human before production use.

## Verify

Run `npm run build` and confirm the gateway appears in `dist/manifest.json` under
`paymentGateways`. Packaging output is `target/plugin.zip` via `npm run package`.

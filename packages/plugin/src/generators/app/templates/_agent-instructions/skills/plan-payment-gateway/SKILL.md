---
name: plan-payment-gateway
description: Required planning before production-bound payment gateway work. Produces a blueprint covering provider integration, PCI scope, webhooks, and a security checklist.
---

# Plan a Payment Gateway

Payment gateways move real money. Do not write gateway code until a blueprint exists at
`plans/gateway-<GatewayName>-blueprint.md` and the developer has confirmed it.

## Blueprint Contents

1. **Provider docs** — link the provider's current official API documentation; note the
   API version being targeted.
2. **PCI scope** — does card data ever touch this code? Prefer hosted payment pages and
   redirect flows that keep the plugin out of PCI scope.
3. **Hosted payment / redirect flow** — what does `prepare()` return for the redirect,
   and how does the user get back to Evoke?
4. **Auth and configured properties** — which credentials and settings does the gateway
   need (API keys, merchant ids, environment URLs)? These become constructor properties
   configured in the Evoke environment.
5. **Sandbox vs production** — how are environments distinguished? Never default to
   production.
6. **Webhooks and signatures** — does the provider send asynchronous notifications
   (`receivePaymentNotification`)? How are they verified (signature scheme, shared
   secrets)?
7. **Testing plan** — sandbox accounts, test cards, and failure cases: declined,
   timeout, duplicate notification.
8. **Security checklist** — secrets never logged or committed; webhook payloads not
   trusted until the signature verifies; amounts validated against the original payment;
   notification handling idempotent.

Keep the blueprint under two minutes to read. Confirm it with the developer before
implementation.

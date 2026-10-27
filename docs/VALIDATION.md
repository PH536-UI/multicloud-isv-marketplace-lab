# Local validation guide

[Português (Brasil)](pt-BR/VALIDATION.md) | English

This guide defines the repeatable, non-commercial validation path for both providers. It assumes the control plane is running at `http://localhost:8080` and uses local demo identities only.

## AWS flow

1. Post an entitlement to `/v1/marketplace/aws/entitlements` with `customerIdentifier`, `productCode` and `planId`.
2. Post usage to `/v1/billing/aws/usage` with a unique, stable `usageKey`.
3. Send the exact same usage again and verify `duplicate: true`.
4. Process the outbox in `record` mode through `/v1/outbox/process`.
5. Read `/v1/dashboards/aws` and verify accepted usage, `pending: 0` and `delivered: 1`.
6. Revoke the tenant with `/v1/marketplace/aws/tenants/{id}/revoke`.
7. Submit a new usage key and verify HTTP 400 because the tenant is suspended.

## OCI flow

1. Post an agreement to `/v1/marketplace/oci/agreements` with `subscriberId`, `listingId` and `planId`.
2. Post usage to `/v1/billing/oci/usage` with a unique, stable `usageKey`.
3. Send the exact same usage again and verify `duplicate: true`.
4. Process the outbox in `record` mode through `/v1/outbox/process`.
5. Read `/v1/dashboards/oci` and verify accepted usage, `pending: 0` and `delivered: 1`.
6. Revoke the tenant with `/v1/marketplace/oci/tenants/{id}/revoke`.
7. Submit a new usage key and verify HTTP 400 because the tenant is suspended.

## Observed local-lab evidence

| Provider | Tenant | Usage | Idempotency | Delivery | Revocation |
|---|---|---:|---|---|---|
| AWS | `aws-demo-customer` | 25 `requests` | Same key returned `duplicate: true` | `pending: 0`, `delivered: 1` | New usage rejected with HTTP 400 |
| OCI | `oci-demo-oci-customer` | 10 `requests` | Same key returned `duplicate: true` | `pending: 0`, `delivered: 1` | New usage rejected with HTTP 400 |

## Interpretation

These results verify the repository local implementation: request normalization, active-tenant enforcement, idempotency, durable outbox workflow and suspension handling. They are not evidence of a real marketplace contract, customer charge, listing approval, production entitlement, Oracle or AWS delivery, or financial settlement.

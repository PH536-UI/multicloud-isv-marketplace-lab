# Portable Control Plane

[Português (Brasil)](README.pt-BR.md) | English

Node.js API that demonstrates the provider-neutral domain of a multi-cloud ISV SaaS.

## Capabilities

- Shared plan catalog: `starter`, `growth` and `enterprise`.
- Provider-neutral tenant and entitlement lifecycle.
- AWS entitlement and OCI subscription-agreement input adapters.
- Revocation suspends a tenant and preserves its audit trail.
- Idempotent usage metering using `usageKey`.
- Atomic JSON persistence, durable outbox, restart recovery and retry with backoff.
- Permission-based demonstration RBAC: `reader`, `operator` and `admin`.

The default delivery mode is `record`: usage is accepted, stored and processed without a commercial API call. `MARKETPLACE_DELIVERY_MODE=production` is reserved for an authorized production runtime with valid commercial configuration and workload identity. It is not a local-lab setting.

## Run locally

```bash
npm ci
npm test
npm run start
```

The service listens on `http://localhost:8080`; `GET /health` is public. In PowerShell, use `npm.cmd` when `npm.ps1` is blocked.

## Demonstration authorization

With `AUTH_MODE=demo`, local Bearer tokens are available only for this lab:

| Role | Token | Permission scope |
|---|---|---|
| Reader | `local-reader` | Read plans, tenants, usage and dashboards |
| Operator | `local-operator` | Reader plus marketplace and usage intake |
| Admin | `local-admin` | Operator plus tenant revocation |

For deployed environments set `AUTH_MODE=edge`, where a verified identity is passed by an edge layer such as API Gateway/ALB with OIDC on AWS or OCI API Gateway with IAM Identity Domains. JWT validation, signing-key rotation and SSO belong at that edge, not in the lab implementation.

## Local contracts

| Provider | Provisioning input | Usage input |
|---|---|---|
| AWS | `customerIdentifier`, `productCode`, `planId` | `customerIdentifier`, `dimension`, `quantity`, `timestamp` |
| OCI | `subscriberId`, `listingId`, `planId` | `subscriberId`, `metric`, `quantity`, `timestamp` |

`usageKey` is optional in the lab but strongly recommended for predictable retries. A usage record is accepted only for an active tenant. Replaying its key returns `duplicate: true` and does not add a second record.

## Endpoints

| Method | Route | Permission |
|---|---|---|
| GET | `/health` | Public |
| GET | `/v1/plans` | `plan:read` |
| GET | `/v1/tenants`, `/v1/tenants/{id}`, `/v1/tenants/{id}/usage` | `tenant:read` |
| GET | `/v1/dashboard`, `/v1/dashboards/aws`, `/v1/dashboards/oci`, `/v1/outbox` | `dashboard:read` |
| POST | `/v1/marketplace/aws/entitlements`, `/v1/marketplace/oci/agreements` | `marketplace:write` |
| POST | `/v1/billing/aws/usage`, `/v1/billing/oci/usage`, `/v1/outbox/process` | `billing:write` |
| POST | `/v1/marketplace/{provider}/tenants/{id}/revoke` | `tenant:revoke` |

## Boundaries

The JSON store is suitable only for local demonstration. Production needs managed persistence, migrations, backup/restore, secret management, signed webhooks, rate limiting, central observability, retained audit records and real marketplace integration controls. No local test proves marketplace publishing, purchase, entitlement, billing or financial settlement.

See the [validation guide](../../docs/VALIDATION.md).

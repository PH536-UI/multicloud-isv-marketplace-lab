# Multi-Cloud ISV Marketplace Lab

[![Control Plane CI](https://github.com/PH536-UI/multicloud-isv-marketplace-lab/actions/workflows/control-plane.yml/badge.svg?branch=main)](https://github.com/PH536-UI/multicloud-isv-marketplace-lab/actions/workflows/control-plane.yml)

[Português (Brasil)](README.pt-BR.md) | English

[![Control Plane CI](https://github.com/PH536-UI/multicloud-isv-marketplace-lab/actions/workflows/control-plane.yml/badge.svg?branch=main)](https://github.com/PH536-UI/multicloud-isv-marketplace-lab/actions/workflows/control-plane.yml)

A software-engineering lab for a portable multi-cloud ISV SaaS control plane, designed around AWS Marketplace and Oracle Cloud Infrastructure (OCI) Marketplace.

> **Local lab only.** Floci emulates AWS and floci-oci emulates OCI. This repository does not prove marketplace publication, commercial entitlements, billing, payouts, tax handling, or cloud-account approval.

## What is implemented

- Portable Node.js control plane with tenants, plans and local RBAC.
- Provider adapters for AWS entitlement events and OCI subscription agreements.
- Tenant suspension or revocation with an audit trail.
- Idempotent usage acceptance through `usageKey`.
- Durable JSON outbox, retry with backoff and restart recovery.
- Provider dashboards for AWS and OCI.
- Terraform roots for AWS/Floci and OCI/floci-oci.

## Architecture

```text
Client
  |
SaaS portal / Control plane
  |- HTTP API: tenants, plans, RBAC, audit
  |- Metering: idempotency, durable outbox, retries
  |- Marketplace adapters: AWS and OCI
  |- AWS runtime: S3 + SQS + DynamoDB via Floci
  `- OCI runtime: Object Storage via floci-oci

Terraform: infra/aws and infra/oci
```

## Quick start

```bash
cp .env.example .env
docker compose up -d
./scripts/health.sh
```

Run only the control plane outside Docker:

```bash
cd apps/control-plane
npm ci
npm run start
```

On Windows PowerShell, use `npm.cmd ci` and `npm.cmd run start` if the execution policy blocks `npm.ps1`. Enter commands only. Do not paste the `PS C:\...>` prompt, output, bullets, or error text into the terminal.

## Local validation evidence

The local AWS and OCI flows have been exercised in `record` delivery mode:

1. Create an entitlement or agreement and an active tenant.
2. Submit usage with a stable `usageKey`.
3. Resubmit the same usage and receive `duplicate: true`.
4. Process the outbox and obtain `pending: 0`, `delivered: 1`.
5. Revoke the tenant and verify that new usage is rejected with HTTP 400.

See the [validation guide](docs/VALIDATION.md), [control-plane guide](apps/control-plane/README.md), [architecture decisions](docs/ARCHITECTURE.md), and [local OCI guide](infra/oci/README.md).

## Documentation languages

Every maintained guide has an English canonical version and a Brazilian Portuguese counterpart:

- [Project guide, PT-BR](README.pt-BR.md)
- [Control plane, PT-BR](apps/control-plane/README.pt-BR.md)
- [Architecture, PT-BR](docs/pt-BR/ARCHITECTURE.md)
- [Validation, PT-BR](docs/pt-BR/VALIDATION.md)
- [OCI local guide, PT-BR](infra/oci/README.pt-BR.md)

## Honest boundaries

This lab validates local protocol flow, adapter boundaries, Terraform configuration and resilience behavior. A real AWS Marketplace or OCI Marketplace offering requires separate seller onboarding, contractual and tax setup, marketplace approval, production identities, security review, commercial configuration and operational monitoring.

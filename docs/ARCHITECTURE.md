# Architecture decisions

[Português (Brasil)](pt-BR/ARCHITECTURE.md) | English

## 001. Terraform is the infrastructure source of truth

AWS and OCI have independent Terraform roots in `infra/aws` and `infra/oci`. Each environment can be initialized, applied, tested and destroyed without operational coupling.

## 002. Local-first, cloud-compatible

- AWS uses its official provider against Floci on `localhost:4566`.
- OCI uses the official `oracle/oci` provider against floci-oci on `localhost:4599`, with SDK client host overrides.
- A real cloud account or real credentials are not required for this lab stage.

## 003. Portable control-plane core

The core keeps provider-specific logic at adapter boundaries. Tenant lifecycle, plans, authorization, usage idempotency, audit and outbox semantics are shared. Provider adapters normalize AWS and OCI inputs into that common model.

## 004. Accept before delivery

Usage is durably recorded with a stable `usageKey` before delivery is attempted. The outbox handles claiming, retry and backoff. This makes delivery restart-safe and prevents repeated client submissions from creating duplicate usage records.

## Target flow

1. A customer subscribes through a marketplace or an equivalent local event is received.
2. The control plane normalizes the provider event and activates a tenant.
3. The tenant submits usage to the provider-specific API route.
4. The control plane validates entitlement status and records usage once.
5. An outbox worker delivers the record in the configured mode.
6. Dashboards expose tenant state, accepted usage and delivery state.

## Outside this phase

Real marketplace listing approval, seller onboarding, contracts, taxes, commercial billing, financial settlement and production credentials.

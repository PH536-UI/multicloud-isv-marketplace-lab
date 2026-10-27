# Guia de validação local

[English](../VALIDATION.md) | Português (Brasil)

Este guia define o caminho repetível e não comercial de validação para os dois provedores. Ele pressupõe que o control plane está em `http://localhost:8080` e usa apenas identidades locais de demonstração.

## Fluxo AWS

1. Envie um entitlement a `/v1/marketplace/aws/entitlements` com `customerIdentifier`, `productCode` e `planId`.
2. Envie uso a `/v1/billing/aws/usage` com uma `usageKey` única e estável.
3. Reenvie exatamente o mesmo uso e confirme `duplicate: true`.
4. Processe a outbox em modo `record` por `/v1/outbox/process`.
5. Consulte `/v1/dashboards/aws` e confirme uso aceito, `pending: 0` e `delivered: 1`.
6. Revogue o tenant com `/v1/marketplace/aws/tenants/{id}/revoke`.
7. Envie uma nova chave de uso e confirme HTTP 400, pois o tenant está suspenso.

## Fluxo OCI

1. Envie um acordo a `/v1/marketplace/oci/agreements` com `subscriberId`, `listingId` e `planId`.
2. Envie uso a `/v1/billing/oci/usage` com uma `usageKey` única e estável.
3. Reenvie exatamente o mesmo uso e confirme `duplicate: true`.
4. Processe a outbox em modo `record` por `/v1/outbox/process`.
5. Consulte `/v1/dashboards/oci` e confirme uso aceito, `pending: 0` e `delivered: 1`.
6. Revogue o tenant com `/v1/marketplace/oci/tenants/{id}/revoke`.
7. Envie uma nova chave de uso e confirme HTTP 400, pois o tenant está suspenso.

## Evidência observada no laboratório local

| Provedor | Tenant | Uso | Idempotência | Entrega | Revogação |
|---|---|---:|---|---|---|
| AWS | `aws-demo-customer` | 25 `requests` | Mesma chave retornou `duplicate: true` | `pending: 0`, `delivered: 1` | Novo uso rejeitado com HTTP 400 |
| OCI | `oci-demo-oci-customer` | 10 `requests` | Mesma chave retornou `duplicate: true` | `pending: 0`, `delivered: 1` | Novo uso rejeitado com HTTP 400 |

## Interpretação

Estes resultados validam a implementação local do repositório: normalização de requisições, imposição de tenant ativo, idempotência, fluxo de outbox durável e suspensão. Não são evidência de contrato real de marketplace, cobrança de cliente, aprovação de listing, entitlement de produção, entrega para Oracle ou AWS, nem repasse financeiro.

# Control Plane Portátil

[English](README.md) | Português (Brasil)

API Node.js que demonstra o domínio independente de provedor de um SaaS ISV multicloud.

## Capacidades

- Catálogo comum de planos: `starter`, `growth` e `enterprise`.
- Ciclo de vida de tenants e entitlement independente de provedor.
- Adaptadores de entrada para entitlement AWS e acordo de assinatura OCI.
- A revogação suspende o tenant e preserva a trilha de auditoria.
- Medição idempotente por `usageKey`.
- Persistência JSON atômica, outbox durável, recuperação após reinício e retry com backoff.
- RBAC de demonstração por permissões: `reader`, `operator` e `admin`.

O modo padrão de entrega é `record`: o uso é aceito, persistido e processado sem chamada comercial. `MARKETPLACE_DELIVERY_MODE=production` é reservado a runtime de produção autorizado, com configuração comercial válida e identidade de workload. Não é uma configuração de laboratório local.

## Executar localmente

```bash
npm ci
npm test
npm run start
```

O serviço escuta em `http://localhost:8080`; `GET /health` é público. No PowerShell, use `npm.cmd` quando `npm.ps1` estiver bloqueado.

## Autorização de demonstração

Com `AUTH_MODE=demo`, os tokens Bearer locais existem apenas neste laboratório:

| Papel | Token | Escopo de permissão |
|---|---|---|
| Reader | `local-reader` | Ler planos, tenants, uso e dashboards |
| Operator | `local-operator` | Reader mais entrada de marketplace e uso |
| Admin | `local-admin` | Operator mais revogação de tenant |

Para ambientes implantados defina `AUTH_MODE=edge`, onde uma identidade verificada é passada por uma camada de borda, como API Gateway/ALB com OIDC na AWS ou OCI API Gateway com IAM Identity Domains. Validação de JWT, rotação de chaves e SSO pertencem a essa borda, não à implementação de laboratório.

## Contratos locais

| Provedor | Entrada de provisionamento | Entrada de uso |
|---|---|---|
| AWS | `customerIdentifier`, `productCode`, `planId` | `customerIdentifier`, `dimension`, `quantity`, `timestamp` |
| OCI | `subscriberId`, `listingId`, `planId` | `subscriberId`, `metric`, `quantity`, `timestamp` |

`usageKey` é opcional no laboratório, mas muito recomendada para retries previsíveis. Um registro de uso só é aceito para tenant ativo. Reenviar a chave devolve `duplicate: true` e não acrescenta um segundo registro.

## Endpoints

| Método | Rota | Permissão |
|---|---|---|
| GET | `/health` | Pública |
| GET | `/v1/plans` | `plan:read` |
| GET | `/v1/tenants`, `/v1/tenants/{id}`, `/v1/tenants/{id}/usage` | `tenant:read` |
| GET | `/v1/dashboard`, `/v1/dashboards/aws`, `/v1/dashboards/oci`, `/v1/outbox` | `dashboard:read` |
| POST | `/v1/marketplace/aws/entitlements`, `/v1/marketplace/oci/agreements` | `marketplace:write` |
| POST | `/v1/billing/aws/usage`, `/v1/billing/oci/usage`, `/v1/outbox/process` | `billing:write` |
| POST | `/v1/marketplace/{provider}/tenants/{id}/revoke` | `tenant:revoke` |

## Limites

O armazenamento JSON é adequado somente à demonstração local. Produção exige persistência gerenciada, migrations, backup/restauração, gestão de segredos, webhooks assinados, rate limiting, observabilidade centralizada, auditoria retida e controles reais de integração de marketplace. Nenhum teste local comprova publicação, compra, entitlement, cobrança ou repasse financeiro.

Veja o [guia de validação](../../docs/pt-BR/VALIDATION.md).

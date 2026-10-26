# Control Plane portátil

API Node.js para demonstrar o domínio comum de um SaaS ISV multicloud.

## O que implementa

- Catálogo comum de planos: `starter`, `growth` e `enterprise`.
- Lifecycle de tenants e entitlement independente do provedor.
- Adaptadores de entrada para entitlement AWS e acordo de assinatura OCI.
- Revogação que suspende o tenant e preserva a trilha de auditoria.
- Medição idempotente por `usageKey`, com painéis comparáveis por provedor.
- Persistência em JSON com escrita atômica.
- Outbox durável, retomada após reinício e retry com backoff.
- RBAC por permissões: `reader`, `operator` e `admin`.

Por padrão, a entrega fica em modo `record`: o uso é aceito, persistido e processado pela outbox sem chamada comercial. Em `MARKETPLACE_DELIVERY_MODE=production`, o adapter AWS usa o SDK Marketplace Metering e o adapter OCI usa o SDK oficial `oci-self`, pelo cliente `PartnerIntegerationClient` e endpoint Self Service de submissão de uso. Esse modo exige runtime autorizado, identidade de workload e configuração comercial válidas.

## Execução local

```bash
node --test
PORT=8080 node src/server.js
```

Com Docker Compose, a API fica disponível em `http://localhost:8080`.

## Autorização de demonstração

Em `AUTH_MODE=demo`, use um Bearer token local:

| Papel | Token | Permissões |
|---|---|---|
| Reader | `local-reader` | Ler planos, tenants, uso e painéis |
| Operator | `local-operator` | Reader + receber eventos de marketplace e uso |
| Admin | `local-admin` | Operator + suspender tenants |

Em ambiente implantado, defina `AUTH_MODE=edge`. Nesse modo, o control plane só aceita a identidade já validada por uma camada de borda, por exemplo API Gateway/ALB com OIDC na AWS ou OCI API Gateway com IAM Identity Domains. A verificação de JWT, rotação de chaves e SSO ficam nessa borda, não no código de demonstração.

## Fluxo de demonstração

```bash
curl -X POST http://localhost:8080/v1/marketplace/aws/entitlements \
  -H 'Authorization: Bearer local-operator' \
  -H 'Content-Type: application/json' \
  -d '{"customerIdentifier":"demo-customer","productCode":"demo-product","planId":"growth"}'

curl -X POST http://localhost:8080/v1/billing/aws/usage \
  -H 'Authorization: Bearer local-operator' \
  -H 'Content-Type: application/json' \
  -d '{"customerIdentifier":"demo-customer","dimension":"requests","quantity":25,"timestamp":"2026-10-27T15:00:00Z","usageKey":"demo-aws-001"}'

curl http://localhost:8080/v1/dashboards/aws \
  -H 'Authorization: Bearer local-reader'
```

## Contrato de medição local

AWS recebe `customerIdentifier`, `dimension`, `quantity` e `timestamp`. OCI recebe `subscriberId`, `metric`, `quantity` e `timestamp`. `usageKey` é opcional no laboratório, mas recomendado para retries previsíveis.

O control plane somente aceita uso de tenant ativo, registra uma única vez cada chave de uso e devolve `duplicate: true` em reenvios. Esta é a regra comum, não uma tradução direta do payload comercial de qualquer marketplace.

## Entrega comercial

Na AWS, o fluxo real de onboarding troca o token de registro por dados do cliente usando `ResolveCustomer`, consulta direito com `GetEntitlements` e envia cobrança por APIs do AWS Marketplace Metering. O mapeamento do produto, credenciais IAM, retry, tratamento de registros não processados e observabilidade devem ficar num adapter AWS implantado.

Na OCI, a publicação atribui oferta, medidor e unidade de medida. A submissão comercial de uso exige identificador idempotente, oferta, valor, moeda, início e fim do período em UTC e dimensão de uso. A API suporta envio unitário ou lote. O adapter implementado envia um registro por evento, usa `usageKey` como `opcRetryToken` e assina a chamada por OCI Resource Principal. O compartment é lido de `OCI_COMPARTMENT_ID`; nenhum segredo fica em código, fixtures ou arquivos de configuração.

Uma conta de teste, listing limitado ou emulador não valida publicação, compra, cobrança, entitlement nem repasse financeiro reais.

## Endpoints

| Método | Rota | Permissão |
|---|---|---|
| GET | `/health` | pública |
| GET | `/v1/plans` | `plan:read` |
| GET | `/v1/tenants` | `tenant:read` |
| GET | `/v1/tenants/{id}` | `tenant:read` |
| GET | `/v1/tenants/{id}/usage` | `tenant:read` |
| GET | `/v1/dashboard` | `dashboard:read` |
| GET | `/v1/dashboards/aws` | `dashboard:read` |
| GET | `/v1/dashboards/oci` | `dashboard:read` |
| POST | `/v1/marketplace/aws/entitlements` | `marketplace:write` |
| POST | `/v1/marketplace/oci/agreements` | `marketplace:write` |
| POST | `/v1/billing/aws/usage` | `billing:write` |
| POST | `/v1/billing/oci/usage` | `billing:write` |
| POST | `/v1/marketplace/{provider}/tenants/{id}/revoke` | `tenant:revoke` |

## Limites desta entrega

O estado local é persistido em arquivo JSON por escrita atômica e, no Compose, fica em volume nomeado. A outbox recupera itens que estavam em processamento e aplica retry com backoff. A retenção de auditoria, secrets manager, rate limit, assinatura de webhooks e observabilidade centralizada continuam como responsabilidades de implantação. Nenhum fluxo local prova publicação, compra, cobrança, entitlement ou repasse financeiro reais.

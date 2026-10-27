# Multi-Cloud ISV Marketplace Lab

Laboratório de engenharia de software para um SaaS multicloud, com base portátil para AWS e Oracle Cloud Infrastructure (OCI).

> Ambiente local: Floci para AWS e floci-oci para OCI. Não representa publicação, cobrança, entitlement ou aprovação real em marketplaces.

## Objetivo

Demonstrar um SaaS de ISV com tenants, planos e um control plane portável, entregue com Terraform e validado em dois emuladores locais:

- AWS em `http://localhost:4566`
- OCI em `http://localhost:4599`

## Arquitetura atual

```text
Cliente
  │
Portal SaaS / Control Plane
  ├── API HTTP: tenants, planos, RBAC e auditoria
  ├── Medição: idempotência, outbox durável e retries
  ├── Adaptadores: AWS Marketplace e OCI Marketplace
  ├── Runtime AWS: S3 + SQS + DynamoDB (Floci)
  └── Runtime OCI: Object Storage (floci-oci)

Terraform
  ├── infra/aws
  └── infra/oci
```

## Estrutura

```text
apps/       # API do control plane, testes e workers
docs/       # decisões de arquitetura
infra/aws/  # Terraform para AWS/Floci
infra/oci/  # Terraform para OCI/floci-oci
scripts/    # verificações locais
compose.yaml
```

## Início rápido

```bash
cp .env.example .env
docker compose up -d
./scripts/health.sh

terraform -chdir=infra/aws init
terraform -chdir=infra/aws apply
```

O Compose usa imagens fixadas do Floci (`2.3.0`) e floci-oci (`0.5.0`). O control plane só inicia depois de os dois emuladores responderem aos healthchecks.

## Control plane disponível

A API local está em `http://localhost:8080`. Ela já oferece:

- provisionamento e revogação de tenants para AWS e OCI;
- planos, RBAC local de demonstração e trilha de auditoria;
- recebimento idempotente de uso, outbox persistente e retry com backoff;
- dashboards de tenant, provider e faturamento em modo `record`.

Para executar somente a API fora do Docker:

```bash
cd apps/control-plane
npm ci
npm run start
```

No PowerShell, caso a política de execução bloqueie `npm.ps1`, use `npm.cmd ci` e `npm.cmd run start`.

A raiz OCI usa o provider oficial Oracle e host overrides para o floci-oci. Veja `infra/oci/README.md` antes de executar.

## Limites honestos

O laboratório prova protocolos, SDKs, Terraform e provisionamento local. Cadastro de vendedor, contratos, impostos, compra, cobrança, entitlement e aprovação de listing são funções dos marketplaces oficiais.

## Próximos incrementos

1. Persistência PostgreSQL, migrations, backup e rollback.
2. Observabilidade com logs estruturados, métricas e tracing.
3. OIDC, webhooks assinados e rate limiting.
4. Painel operacional para tenants, uso e falhas.

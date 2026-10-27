# Multi-Cloud ISV Marketplace Lab

Laboratório de engenharia de software para um SaaS multicloud, com base portátil para AWS e Oracle Cloud Infrastructure (OCI).

> Ambiente local: Floci para AWS e floci-oci para OCI. Não representa publicação, cobrança, entitlement ou aprovação real em marketplaces.

## Objetivo

Demonstrar um SaaS de ISV com tenants, planos e um control plane portável, entregue com Terraform e validado em dois emuladores locais:

- AWS em `http://localhost:4566`
- OCI em `http://localhost:4599`

## Arquitetura inicial

```text
Cliente
  │
Portal SaaS / Control Plane
  ├── Runtime AWS: S3 + SQS + DynamoDB (Floci)
  └── Runtime OCI: Object Storage (floci-oci)

Terraform
  ├── infra/aws
  └── infra/oci
```

## Estrutura

```text
apps/       # API, portal e workers, nas próximas etapas
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

A raiz OCI usa o provider oficial Oracle e host overrides para o floci-oci. Veja `infra/oci/README.md` antes de executar.

## Limites honestos

O laboratório prova protocolos, SDKs, Terraform e provisionamento local. Cadastro de vendedor, contratos, impostos, compra, cobrança, entitlement e aprovação de listing são funções dos marketplaces oficiais.

## Próximas entregas

1. API de tenants e planos.
2. Dois painéis espelhados: AWS e OCI.
3. Adaptadores de licença/marketplace.
4. CI, testes e evidências de execução.

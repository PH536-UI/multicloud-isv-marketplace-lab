# Multi-Cloud ISV Marketplace Lab

[English](README.md) | Português (Brasil)

Laboratório de engenharia de software para um control plane SaaS ISV multicloud e portátil, orientado a AWS Marketplace e Oracle Cloud Infrastructure (OCI) Marketplace.

> **Somente laboratório local.** Floci emula AWS e floci-oci emula OCI. Este repositório não comprova publicação em marketplace, entitlement comercial, cobrança, repasse, impostos ou aprovação de conta cloud.

## O que está implementado

- Control plane Node.js portátil com tenants, planos e RBAC local.
- Adaptadores para eventos de entitlement AWS e acordos de assinatura OCI.
- Suspensão ou revogação de tenant com trilha de auditoria.
- Aceite de uso idempotente por `usageKey`.
- Outbox JSON durável, retry com backoff e recuperação após reinício.
- Dashboards por provedor, para AWS e OCI.
- Raízes Terraform para AWS/Floci e OCI/floci-oci.

## Arquitetura

```text
Cliente
  |
Portal SaaS / Control plane
  |- API HTTP: tenants, planos, RBAC e auditoria
  |- Medição: idempotência, outbox durável e retries
  |- Adaptadores de marketplace: AWS e OCI
  |- Runtime AWS: S3 + SQS + DynamoDB por Floci
  `- Runtime OCI: Object Storage por floci-oci

Terraform: infra/aws e infra/oci
```

## Início rápido

```bash
cp .env.example .env
docker compose up -d
./scripts/health.sh
```

Para executar só o control plane, fora do Docker:

```bash
cd apps/control-plane
npm ci
npm run start
```

No PowerShell do Windows, use `npm.cmd ci` e `npm.cmd run start` se a política de execução bloquear `npm.ps1`. Digite somente comandos. Não cole no terminal o prompt `PS C:\...>`, linhas de saída, marcadores ou textos de erro.

## Evidência de validação local

Os fluxos AWS e OCI foram exercitados localmente em modo de entrega `record`:

1. Criar entitlement ou acordo e tenant ativo.
2. Enviar uso com `usageKey` estável.
3. Reenviar o mesmo uso e receber `duplicate: true`.
4. Processar a outbox e obter `pending: 0`, `delivered: 1`.
5. Revogar o tenant e confirmar que novo uso é rejeitado com HTTP 400.

Veja o [guia de validação](docs/pt-BR/VALIDATION.md), o [guia do control plane](apps/control-plane/README.pt-BR.md), as [decisões de arquitetura](docs/pt-BR/ARCHITECTURE.md) e o [guia OCI local](infra/oci/README.pt-BR.md).

## Documentação em dois idiomas

Cada guia mantido possui uma versão canônica em inglês e uma versão em português brasileiro:

- [Guia do projeto, English](README.md)
- [Control plane, English](apps/control-plane/README.md)
- [Arquitetura, English](docs/ARCHITECTURE.md)
- [Validação, English](docs/VALIDATION.md)
- [Guia OCI local, English](infra/oci/README.md)

## Limites honestos

Este laboratório valida o fluxo de protocolos local, os limites dos adaptadores, a configuração Terraform e o comportamento de resiliência. Uma oferta real no AWS Marketplace ou OCI Marketplace exige onboarding de vendedor, contratos e impostos, aprovação do marketplace, identidades de produção, revisão de segurança, configuração comercial e monitoramento operacional próprios.

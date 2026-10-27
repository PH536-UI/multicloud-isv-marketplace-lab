# Decisões de arquitetura

[English](../ARCHITECTURE.md) | Português (Brasil)

## 001. Terraform é a fonte de verdade da infraestrutura

AWS e OCI têm raízes Terraform independentes em `infra/aws` e `infra/oci`. Cada ambiente pode ser inicializado, aplicado, testado e destruído sem acoplamento operacional.

## 002. Local-first, compatível com cloud

- AWS usa o provider oficial contra Floci em `localhost:4566`.
- OCI usa o provider oficial `oracle/oci` contra floci-oci em `localhost:4599`, com host overrides por cliente SDK.
- Uma conta cloud real ou credenciais reais não são necessárias nesta fase do laboratório.

## 003. Core portátil do control plane

O core mantém a lógica específica de provedor nos limites dos adaptadores. Ciclo de vida de tenant, planos, autorização, idempotência de uso, auditoria e semântica de outbox são compartilhados. Os adaptadores normalizam entradas AWS e OCI nesse modelo comum.

## 004. Aceitar antes de entregar

O uso é registrado de modo durável com uma `usageKey` estável antes da tentativa de entrega. A outbox trata claim, retry e backoff. Isso torna a entrega segura após reinício e evita que reenvios do cliente criem registros duplicados.

## Fluxo alvo

1. Um cliente assina pelo marketplace ou é recebido um evento local equivalente.
2. O control plane normaliza o evento do provedor e ativa um tenant.
3. O tenant envia uso à rota de API específica do provedor.
4. O control plane valida o entitlement e registra o uso uma única vez.
5. Um worker de outbox entrega o registro no modo configurado.
6. Dashboards expõem estado do tenant, uso aceito e estado de entrega.

## Fora desta fase

Aprovação de listing real, onboarding de vendedor, contratos, impostos, cobrança comercial, repasse financeiro e credenciais de produção.

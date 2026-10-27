# Decisões de arquitetura

## 001. Terraform é a fonte de verdade

Cada nuvem tem uma raiz Terraform independente em `infra/aws` e `infra/oci`. Assim cada ambiente pode ser aplicado, testado e destruído sem acoplamento operacional.

## 002. Local first, cloud-compatible

- AWS usa o provider oficial contra Floci em `localhost:4566`.
- OCI usa o provider oficial contra floci-oci em `localhost:4599` com host override por cliente.
- Nenhuma credencial ou conta cloud real é necessária nesta fase.

## 003. Core portátil

A futura API não chamará SDK de nuvem diretamente. Ela chamará adaptadores `AwsProvisioner` e `OciProvisioner`, evitando condicionais de provedor espalhadas pelo produto.

## Fluxo alvo

1. Usuário entra no portal.
2. Cria ou escolhe tenant e plano.
3. Seleciona AWS ou OCI.
4. A API abre uma solicitação de provisionamento.
5. Um worker chama o adaptador da nuvem escolhida.
6. O painel exibe recursos, logs e health do tenant.

## Fora desta fase

Listing real, billing, impostos, contrato comercial, aprovação de marketplace e credenciais de produção.

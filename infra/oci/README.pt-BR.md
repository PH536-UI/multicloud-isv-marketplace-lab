# OCI local com floci-oci

[English](README.md) | Português (Brasil)

Esta raiz Terraform usa o provider oficial `oracle/oci` contra floci-oci. O roteamento para o emulador é feito por host overrides de cliente do SDK OCI injetados por `TF_VAR_CLIENT_HOST_OVERRIDES`, e não por atributo de bloco `provider`.

## Escopo da configuração

- Namespace de Object Storage consultado pelo provider.
- Bucket privado `${project}-oci-tenant-artifacts`.
- Versões de Terraform e do provider OCI travadas na configuração Terraform.

## Linux e macOS

```bash
docker compose up -d floci-oci
cd infra/oci
cp terraform.tfvars.example terraform.tfvars
openssl genrsa -out local-test-key.pem 2048
export TF_VAR_CLIENT_HOST_OVERRIDES="oci_identity.IdentityClient=http://localhost:4599;oci_object_storage.ObjectStorageClient=http://localhost:4599"
terraform init
terraform apply
```

## Windows

Com Docker Desktop em execução, rode `EXECUTAR-OCI-WINDOWS.cmd` na raiz do projeto. Ele cria uma chave descartável e exclusiva do emulador, inicia o floci-oci e executa Terraform num container com `host.docker.internal:4599`.

## Limites

- O emulador OCI local usa armazenamento em memória neste laboratório; recriar o container remove os recursos OCI locais.
- A chave de teste gerada não é uma chave OCI real e nunca deve ser reutilizada fora deste laboratório.
- A validação estática do Terraform não comprova criação de recursos. Rode o apply somente onde Docker estiver disponível.
- Nenhuma tenancy, credencial, cobrança, listing ou entitlement OCI real é usada.

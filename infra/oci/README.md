# OCI local com floci-oci

Esta raiz usa o provider oficial `oracle/oci` contra o floci-oci em `http://localhost:4599`.

## Rodar localmente

1. Na raiz do projeto, execute `docker compose up -d`.
2. Copie `terraform.tfvars.example` para `terraform.tfvars`.
3. Gere uma chave descartável de teste, se a versão do provider exigir o arquivo:
   ```bash
   openssl genrsa -out local-test-key.pem 2048
   ```
4. Execute:
   ```bash
   terraform init
   terraform apply
   ```

Nunca use chave de API, tenancy ou OCID reais no laboratório. O host override garante que o cliente OCI fale com o emulador local.

## Escopo atual

Object Storage é o primeiro recurso validado. Outros serviços OCI entram somente depois de teste contra a versão instalada do floci-oci.

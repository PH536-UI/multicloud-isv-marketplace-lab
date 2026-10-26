# OCI local com floci-oci

Esta raiz usa o provider oficial `oracle/oci` contra o floci-oci. O roteamento para o emulador é feito pelo mecanismo de host overrides do SDK OCI, injetado por `TF_VAR_CLIENT_HOST_OVERRIDES`, e não como atributo do bloco `provider`.

## Escopo validado na configuração

- Namespace Object Storage consultado pelo provider.
- Bucket privado `${project}-oci-tenant-artifacts`.
- Provider `oracle/oci` validado com Terraform v1.17.0 e OCI provider v9.11.0.

## Rodar localmente em Linux/macOS

1. Na raiz do projeto, inicie o emulador:
   ```bash
   docker compose up -d floci-oci
   ```
2. Entre nesta pasta e crie os arquivos locais, que permanecem ignorados pelo Git:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   openssl genrsa -out local-test-key.pem 2048
   ```
3. Exporte os hosts do emulador e execute Terraform:
   ```bash
   export TF_VAR_CLIENT_HOST_OVERRIDES="oci_identity.IdentityClient=http://localhost:4599;oci_object_storage.ObjectStorageClient=http://localhost:4599"
   terraform init
   terraform apply
   ```

## Windows

Com Docker Desktop em execução, abra `EXECUTAR-OCI-WINDOWS.cmd` na raiz do projeto. O atalho cria uma chave descartável, inicia apenas o floci-oci e executa Terraform dentro de um container com o endpoint `host.docker.internal:4599`.

## Limites

- O `floci-oci` deste laboratório usa armazenamento em memória por causa de uma limitação de permissão observada no volume persistente no Windows. Recriar o container remove seus recursos OCI locais.
- Uma chave local gerada para o emulador não serve para OCI real e não deve ser reutilizada fora deste laboratório.
- O apply contra o emulador precisa ser executado onde Docker esteja disponível. Validação estática não é evidência de criação de recursos.
- Nenhuma tenancy, chave, billing, listing ou entitlement real é usado aqui.

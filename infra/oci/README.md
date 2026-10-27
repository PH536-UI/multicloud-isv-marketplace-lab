# Local OCI with floci-oci

[Português (Brasil)](README.pt-BR.md) | English

This Terraform root uses the official `oracle/oci` provider against floci-oci. Routing to the emulator is done with OCI SDK client host overrides injected through `TF_VAR_CLIENT_HOST_OVERRIDES`, not by a provider-block attribute.

## Configuration scope

- Object Storage namespace queried by the provider.
- Private `${project}-oci-tenant-artifacts` bucket.
- Terraform and OCI provider versions are locked in the Terraform configuration.

## Linux and macOS

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

With Docker Desktop running, execute `EXECUTAR-OCI-WINDOWS.cmd` from the project root. It creates an emulator-only disposable key, starts floci-oci and runs Terraform in a container using `host.docker.internal:4599`.

## Boundaries

- The local OCI emulator uses in-memory storage in this lab; recreating its container removes local OCI resources.
- The generated test key is not a real OCI key and must never be reused outside this lab.
- Terraform static validation does not prove resource creation. Run the apply only where Docker is available.
- No real OCI tenancy, credential, billing, listing or entitlement is used.

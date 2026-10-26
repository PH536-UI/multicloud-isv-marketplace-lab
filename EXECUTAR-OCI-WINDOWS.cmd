@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "PROJECT_DIR=%~dp0"
set "COMPOSE_FILE=%PROJECT_DIR%compose.yaml"
set "OCI_DIR=%PROJECT_DIR%infra\oci"
cd /d "%PROJECT_DIR%"
title Multi-Cloud ISV Lab - OCI local

echo.
echo Multi-Cloud ISV Lab - OCI local
if not exist "%COMPOSE_FILE%" (
  echo.
  echo ERRO: compose.yaml nao foi encontrado nesta pasta.
  echo Extraia o ZIP inteiro antes de executar este arquivo.
  goto :end
)

if not exist "%OCI_DIR%\terraform.tfvars" (
  copy /y "%OCI_DIR%\terraform.tfvars.example" "%OCI_DIR%\terraform.tfvars" >nul
)

if not exist "%OCI_DIR%\local-test-key.pem" (
  echo Gerando chave descartavel para o emulador OCI...
  docker run --rm -v "%PROJECT_DIR%:/workspace" alpine:3.20 sh -c "apk add --no-cache openssl > /dev/null && openssl genrsa -out /workspace/infra/oci/local-test-key.pem 2048"
  if errorlevel 1 goto :end
)

echo.
echo Subindo floci-oci local...
docker compose -f "%COMPOSE_FILE%" up -d floci-oci
if errorlevel 1 goto :end

echo.
echo Aplicando Terraform no floci-oci local...
docker run --rm -e "TF_VAR_CLIENT_HOST_OVERRIDES=oci_identity.IdentityClient=http://host.docker.internal:4599;oci_object_storage.ObjectStorageClient=http://host.docker.internal:4599" -v "%PROJECT_DIR%:/workspace" -w /workspace/infra/oci hashicorp/terraform:1.17.0 init -input=false
if errorlevel 1 goto :end

docker run --rm -e "TF_VAR_CLIENT_HOST_OVERRIDES=oci_identity.IdentityClient=http://host.docker.internal:4599;oci_object_storage.ObjectStorageClient=http://host.docker.internal:4599" -v "%PROJECT_DIR%:/workspace" -w /workspace/infra/oci hashicorp/terraform:1.17.0 apply -auto-approve -input=false

:end
echo.
echo Nenhum recurso foi criado na OCI real.
echo Pressione qualquer tecla para fechar.
pause >nul

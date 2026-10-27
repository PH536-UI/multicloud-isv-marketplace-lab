@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "PROJECT_DIR=%~dp0"
set "COMPOSE_FILE=%PROJECT_DIR%compose.yaml"
cd /d "%PROJECT_DIR%"
title Multi-Cloud ISV Lab - AWS local / AWS local

echo.
echo Multi-Cloud ISV Lab - AWS local / AWS local
if not exist "%COMPOSE_FILE%" (
  echo.
  echo ERROR / ERRO: compose.yaml was not found in this folder / nao foi encontrado nesta pasta.
  echo Extract the complete ZIP before running this file / Extraia o ZIP inteiro antes de executar este arquivo.
  echo.
  dir /b
  goto :end
)

echo.
echo Starting local Floci AWS / Iniciando Floci AWS local...
docker compose -f "%COMPOSE_FILE%" up -d floci-aws
if errorlevel 1 goto :end

echo.
echo Applying Terraform to local Floci / Aplicando Terraform no Floci local...
docker run --rm -v "%PROJECT_DIR%:/workspace" -w /workspace/infra/aws hashicorp/terraform:1.17.0 init -input=false
if errorlevel 1 goto :end

docker run --rm -v "%PROJECT_DIR%:/workspace" -w /workspace/infra/aws hashicorp/terraform:1.17.0 apply -auto-approve -input=false -var="floci_endpoint=http://host.docker.internal:4566"

:end
echo.
echo No resources were created in real AWS / Nenhum recurso foi criado na AWS real.
echo Press any key to close / Pressione qualquer tecla para fechar.
pause >nul

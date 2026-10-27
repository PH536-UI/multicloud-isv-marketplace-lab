@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "PROJECT_DIR=%~dp0"
set "COMPOSE_FILE=%PROJECT_DIR%compose.yaml"
cd /d "%PROJECT_DIR%"
title Multi-Cloud ISV Lab - AWS local

echo.
echo Multi-Cloud ISV Lab - AWS local
if not exist "%COMPOSE_FILE%" (
  echo.
  echo ERRO: compose.yaml nao foi encontrado nesta pasta.
  echo Extraia o ZIP inteiro antes de executar este arquivo.
  echo.
  dir /b
  goto :end
)

echo.
echo Subindo Floci AWS local...
docker compose -f "%COMPOSE_FILE%" up -d floci-aws
if errorlevel 1 goto :end

echo.
echo Aplicando Terraform no Floci local...
docker run --rm -v "%PROJECT_DIR%:/workspace" -w /workspace/infra/aws hashicorp/terraform:1.17.0 init -input=false
if errorlevel 1 goto :end

docker run --rm -v "%PROJECT_DIR%:/workspace" -w /workspace/infra/aws hashicorp/terraform:1.17.0 apply -auto-approve -input=false -var="floci_endpoint=http://host.docker.internal:4566"

:end
echo.
echo Nenhum recurso foi criado na AWS real.
echo Pressione qualquer tecla para fechar.
pause >nul

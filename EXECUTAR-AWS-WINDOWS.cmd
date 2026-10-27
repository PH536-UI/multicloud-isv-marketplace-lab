@echo off
setlocal
cd /d "%~dp0"
title Multi-Cloud ISV Lab - AWS local

echo Subindo Floci AWS local...
docker compose up -d floci-aws
if errorlevel 1 goto :end

echo Aplicando Terraform no Floci local...
docker run --rm -v "%CD%:/workspace" -w /workspace/infra/aws hashicorp/terraform:1.17.0 init -input=false
if errorlevel 1 goto :end

docker run --rm -v "%CD%:/workspace" -w /workspace/infra/aws hashicorp/terraform:1.17.0 apply -auto-approve -input=false -var="floci_endpoint=http://host.docker.internal:4566"

:end
echo.
echo Nenhum recurso foi criado na AWS real.
pause

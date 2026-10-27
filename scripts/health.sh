#!/usr/bin/env sh
set -eu

echo "AWS / Floci"
curl -fsS http://localhost:4566/_floci/health || curl -fsS http://localhost:4566/_localstack/health
printf "\n\nOCI / floci-oci\n"
curl -fsS http://localhost:4599/_floci-oci/health
printf "\n"

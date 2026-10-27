.PHONY: up down logs health aws-init aws-apply aws-destroy oci-init oci-apply oci-destroy fmt

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

health:
	./scripts/health.sh

aws-init:
	terraform -chdir=infra/aws init

aws-apply:
	terraform -chdir=infra/aws apply

aws-destroy:
	terraform -chdir=infra/aws destroy

oci-init:
	terraform -chdir=infra/oci init

oci-apply:
	terraform -chdir=infra/oci apply

oci-destroy:
	terraform -chdir=infra/oci destroy

fmt:
	terraform -chdir=infra/aws fmt -recursive
	terraform -chdir=infra/oci fmt -recursive

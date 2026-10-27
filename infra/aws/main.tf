locals {
  name = "${var.project}-aws"
}

resource "aws_s3_bucket" "tenant_artifacts" {
  bucket = "${local.name}-tenant-artifacts"
}

resource "aws_sqs_queue" "provisioning" {
  name                      = "${local.name}-provisioning"
  message_retention_seconds = 1209600
}

resource "aws_dynamodb_table" "tenants" {
  name         = "${local.name}-tenants"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenant_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }
}

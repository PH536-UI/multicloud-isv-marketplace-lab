output "s3_bucket" {
  value = aws_s3_bucket.tenant_artifacts.bucket
}

output "provisioning_queue" {
  value = aws_sqs_queue.provisioning.url
}

output "tenants_table" {
  value = aws_dynamodb_table.tenants.name
}

variable "region" {
  description = "Região AWS simulada pelo Floci."
  type        = string
  default     = "us-east-1"
}

variable "floci_endpoint" {
  description = "Endpoint local do Floci AWS."
  type        = string
  default     = "http://localhost:4566"
}

variable "project" {
  description = "Prefixo dos recursos do laboratório."
  type        = string
  default     = "multicloud-isv"
}

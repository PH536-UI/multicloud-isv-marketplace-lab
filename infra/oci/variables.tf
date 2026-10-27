variable "tenancy_ocid" {
  description = "OCID fictício para o emulador local."
  type        = string
}

variable "user_ocid" {
  description = "OCID fictício para o emulador local."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint fictício para o emulador local."
  type        = string
}

variable "private_key_path" {
  description = "Caminho para chave de teste local."
  type        = string
}

variable "region" {
  type    = string
  default = "us-ashburn-1"
}

variable "compartment_ocid" {
  type = string
}

variable "namespace" {
  type    = string
  default = "floci-local"
}

variable "project" {
  type    = string
  default = "multicloud-isv"
}

variable "client_host_overrides" {
  description = "Host overrides do SDK OCI para o floci-oci."
  type        = map(string)
  default     = {}
}

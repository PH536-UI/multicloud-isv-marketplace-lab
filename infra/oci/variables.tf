variable "tenancy_ocid" {
  description = "OCID fictício exclusivo do tenancy local no floci-oci."
  type        = string
}

variable "user_ocid" {
  description = "OCID fictício do usuário local que assina chamadas para o emulador."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint fictício da chave descartável do laboratório."
  type        = string
}

variable "private_key_path" {
  description = "Caminho local para uma chave de teste descartável, ignorada pelo Git."
  type        = string
}

variable "region" {
  description = "Região OCI simulada pelo floci-oci."
  type        = string
  default     = "us-ashburn-1"
}

variable "compartment_ocid" {
  description = "Compartimento fictício usado pelo emulador local."
  type        = string
}

variable "project" {
  description = "Prefixo de recursos do laboratório."
  type        = string
  default     = "multicloud-isv"
}

resource "oci_objectstorage_bucket" "tenant_artifacts" {
  compartment_id = var.compartment_ocid
  namespace      = var.namespace
  name           = "${var.project}-oci-tenant-artifacts"
  access_type    = "NoPublicAccess"
  storage_tier   = "Standard"
}

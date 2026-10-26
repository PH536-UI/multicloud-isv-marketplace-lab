data "oci_objectstorage_namespace" "current" {
  compartment_id = var.compartment_ocid
}

resource "oci_objectstorage_bucket" "tenant_artifacts" {
  compartment_id = var.compartment_ocid
  namespace      = data.oci_objectstorage_namespace.current.namespace
  name           = "${var.project}-oci-tenant-artifacts"
  access_type    = "NoPublicAccess"
  storage_tier   = "Standard"
}

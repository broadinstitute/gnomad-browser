module "default-project-services" {
  source  = "terraform-google-modules/project-factory/google//modules/project_services"
  version = "13.0.0"

  project_id = var.project_id

  activate_apis = [
    "dataproc.googleapis.com",
    "cloudfunctions.googleapis.com",
    "compute.googleapis.com",
  ]

  disable_dependent_services  = true
  disable_services_on_destroy = false
}

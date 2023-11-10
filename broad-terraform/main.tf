provider "google" {
  project = var.project_id
  region = var.default_resource_region
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host  = "https://${module.gnomad-browser-infra.gke_cluster_api_endpoint}"
  token = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(
    module.gnomad-browser-infra.gke_cluster_ca_cert,
  )
}

module "gnomad-browser-vpc" {
  source              = "github.com/Garvan-Data-Science-Platform/tgg-terraform-modules//gnomad-vpc?ref=2-generalise-google-project"
  network_name_prefix = "garvan-gnomad"
  project_id          = var.project_id
}

module "gnomad-browser-infra" {
  source                                = "github.com/Garvan-Data-Science-Platform/tgg-terraform-modules//gnomad-browser-infra?ref=2-generalise-google-project"
  infra_prefix                          = var.project_id
  project_id                            = var.project_id
  default_resource_region               = var.default_resource_region
  deletion_protection                   = var.deletion_protection
  gke_control_plane_zone                = "${var.default_resource_region}-a"
  gke_pods_range_slice                  = "10.164.0.0/14"
  gke_services_range_slice              = "10.168.0.0/20"
  data_pipeline_bucket_location         = var.default_resource_region
  es_snapshots_bucket_location          = var.default_resource_region
  gke_control_plane_authorized_networks = var.authorized_networks

  # Ensure vpc is created first
  vpc_network_name                      = module.gnomad-browser-vpc.gnomad_vpc_network_name
  vpc_subnet_name                       = "${module.gnomad-browser-vpc.gnomad_vpc_network_name}-gke"
  depends_on                            = [module.gnomad-browser-vpc]

}

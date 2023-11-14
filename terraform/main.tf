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
  source                  = "github.com/Garvan-Data-Science-Platform/tgg-terraform-modules//gnomad-vpc?ref=2-generalise-modules"
  #vpc_sub_module_source   = "github.com/Garvan-Data-Science-Platform/tgg-terraform-modules//vpc-with-nat-subnet?ref=2-generalise-modules"
  network_name_prefix     = var.network_name_prefix 
  project_id              = var.project_id
}




module "gnomad-browser-infra" {
  source                                = "github.com/Garvan-Data-Science-Platform/tgg-terraform-modules//gnomad-browser-infra?ref=2-generalise-modules"
  #gke_sub_module_source                 = "github.com/Garvan-Data-Science-Platform/tgg-terraform-modules//private-gke-cluster?ref=2-generalise-modules"
  infra_prefix                          = var.project_id
  project_id                            = var.project_id
  deletion_protection                   = var.deletion_protection
  default_resource_region               = var.default_resource_region
  gke_control_plane_zone                = var.default_resource_zone 
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

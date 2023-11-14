variable "project_id" {
  description = "The name of the target GCP project, for creating IAM memberships"
  type        = string
}

variable "vpc_module_source" {
  description = "The URL of repository and specific release of gnomad-vpc module"
  type        = string
  default     = "github.com/broadinstitute/tgg-terraform-modules//gnomad-vpc?ref=main"
}

variable "vpc_sub_module_source" {
  description = "The URL of repository and specific release of vpc-with-nat-subnet module"
  type        = string
  default     = "github.com/broadinstitute/tgg-terraform-modules//vpc-with-nat-subnet?ref=vpc-with-nat-subnet-v1.0.0"
}

variable "network_name_prefix" {
  description = ""
  type        = string
  default     = "gnomad-mynetwork"
}

variable "gke_module_source" {
  description = "The URL of repository and specific release of gnomad-browser-infra module"
  type        = string
  default     = "github.com/broadinstitute/tgg-terraform-modules//gnomad-browser-infra?ref=main"
}

variable "gke_sub_module_source" {
  description = "The URL of repository and specific release of private-gke-cluster module"
  type        = string
  default     = "github.com/broadinstitute/tgg-terraform-modules//private-gke-cluster?ref=private-gke-cluster-v1.0.3"
}

variable "deletion_protection" {
  description = "Whether Terraform is prevented from destroying the cluster"
  type        = string
  default     = true
}

variable "default_resource_region" {
  type        = string
  description = "For managed items that require a region/location"
}

variable "default_resource_zone" {
  type        = string
  description = "For managed items that require a zone"
}

variable "authorized_networks" {
  description = "The IPv4 CIDR ranges that should be allowed to connect to the control plane"
  type        = list(string)
  default     = []
}

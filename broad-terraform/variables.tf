variable "project_id" {
  description = "The name of the target GCP project, for creating IAM memberships"
  type        = string
}

variable "default_resource_region" {
  type        = string
  description = "For managed items that require a region/location"
  default     = "australia-southeast1"
}

variable "deletion_protection" {
  description = "Whether or not to allow Terraform to destroy the cluster"
  type        = string
  default     = true
}

variable "authorized_networks" {
  description = "The IPv4 CIDR ranges that should be allowed to connect to the control plane"
  type        = list(string)
  default     = []
}

variable "project_id" {
  description = "The name of the target GCP project, for creating IAM memberships"
  type        = string
}

variable "default_resource_region" {
  type        = string
  description = "For managed items that require a region/location"
  default     = "australia-southeast1"
}

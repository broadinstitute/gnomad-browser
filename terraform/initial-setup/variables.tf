variable "project_id" {
  description = "Name of the GCP project"
  type = string
}

variable "region" {
  description = "Region for GCP resources"
  type = string
}

variable "zone" {
  description = "Zone for GCP resources"
  type = string
}

variable "tf_state_bucket_name" {
  description = "Name of GCP storage bucket for terraform state files"
  type = string
}

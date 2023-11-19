terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "5.3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_storage_bucket" "default" {
  name  = var.tf_state_bucket_name
  force_destroy = false
  location = var.region
  storage_class = "STANDARD"
  versioning {
    enabled = true
  }
}

terraform {
  required_version = ">= 1.5.0"

  backend "gcs" {
    bucket = "gnomadev-terraform-state"
    prefix = "lr-redis"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.22.0"
    }
  }
}

provider "google" {
  project = "gnomadev"
  region  = "us-east1"
}

data "google_compute_network" "gnomad_v4_dev" {
  project = "gnomadev"
  name    = "gnomad-v4-dev"
}

# Memorystore was not previously enabled in gnomadev. Keep the narrow API
# prerequisite in this independent state so ownership is reproducible.
resource "google_project_service" "redis" {
  project = "gnomadev"
  service = "redis.googleapis.com"

  disable_on_destroy = false
}

resource "google_redis_instance" "gnomad_lr" {
  project        = "gnomadev"
  region         = "us-east1"
  name           = "gnomad-lr-redis"
  display_name   = "gnomAD LR Cloud Run Redis"
  tier           = "BASIC"
  memory_size_gb = 1
  redis_version  = "REDIS_7_2"

  authorized_network = data.google_compute_network.gnomad_v4_dev.id
  connect_mode       = "DIRECT_PEERING"
  reserved_ip_range  = "10.252.0.0/29"

  # The current ioredis clients use plaintext redis:// URLs with no AUTH and
  # select logical DBs 1 (cache) and 2 (rate limiter). Private VPC reachability
  # is the access boundary; this root does not change the Cloud Run service.
  auth_enabled            = false
  transit_encryption_mode = "DISABLED"
  deletion_protection     = true

  labels = {
    application = "gnomad-lr"
    managed_by  = "terraform"
    purpose     = "cloud-run-cache-rate-limit"
  }

  depends_on = [google_project_service.redis]

  lifecycle {
    prevent_destroy = true
  }
}

terraform {
  backend "gcs" {
    bucket = "gnomadev-terraform-state"
    prefix = "lr-viewer"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 7.22.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = ">= 3.0.0"
    }
  }
}

provider "google" {
  project = "gnomadev"
  region  = "us-east1"
  zone    = "us-east1-c"
}

provider "docker" {
  registry_auth {
    address     = "us-docker.pkg.dev"
    config_file = pathexpand("~/.docker/config.json")
  }
}

variable "es_proxy_url" {
  description = "URL of the read-only ES proxy Cloud Run service"
  type        = string
}

locals {
  api_image_name     = "us-docker.pkg.dev/gnomadev/gnomad/gnomad-lr-api"
  browser_image_name = "us-docker.pkg.dev/gnomadev/gnomad/gnomad-lr-browser"
}

# Look up image digests — changes whenever an image is pushed
data "docker_registry_image" "api" {
  name = "${local.api_image_name}:latest"
}

data "docker_registry_image" "browser" {
  name = "${local.browser_image_name}:latest"
}

# --- Networking ---
data "google_compute_network" "vpc_network" {
  name = "gnomad-v4-dev"
}

data "google_compute_subnetwork" "vpc_subnetwork" {
  name   = "gnomad-v4-dev-main"
  region = "us-east1"
}

# --- Service Account ---
resource "google_service_account" "gnomad_lr_sa" {
  account_id   = "gnomad-lr-sa"
  display_name = "gnomAD LR Service Account"
}

# Grant Storage Object Viewer for Terra VCFs (in gnomadev)
resource "google_project_iam_member" "sa_storage" {
  project = "gnomadev"
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.gnomad_lr_sa.email}"
}

# Grant Artifact Registry Reader (in gnomadev)
resource "google_project_iam_member" "sa_artifact" {
  project = "gnomadev"
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gnomad_lr_sa.email}"
}

# CROSS-PROJECT IAM: Grant access to invoke the ES Proxy in exac-gnomad
resource "google_cloud_run_service_iam_member" "proxy_invoker" {
  project  = "exac-gnomad"
  location = "us-east1"
  service  = "gnomad-es-readonly-proxy"
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.gnomad_lr_sa.email}"
}

# --- Data Bucket ---
resource "google_storage_bucket" "lr_data" {
  name          = "gnomad-lr-data"
  project       = "gnomadev"
  location      = "US-EAST1"
  force_destroy = true

  uniform_bucket_level_access = true
}

resource "google_storage_bucket_iam_member" "sa_lr_data" {
  bucket = google_storage_bucket.lr_data.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.gnomad_lr_sa.email}"
}

# --- Firewalls ---
# Allow internal traffic to ClickHouse and Redis from the Cloud Run Subnet
resource "google_compute_firewall" "gnomad_lr_internal" {
  name    = "gnomad-lr-allow-internal"
  network = data.google_compute_network.vpc_network.name
  project = "gnomadev"

  allow {
    protocol = "tcp"
    ports    = ["6379", "8123", "9000"]
  }
  source_ranges = ["192.168.0.0/20"]
  target_tags   = ["gnomad-lr-data"]
}

# Allow SSH via IAP
resource "google_compute_firewall" "gnomad_lr_iap_ssh" {
  name    = "gnomad-lr-allow-iap-ssh"
  network = data.google_compute_network.vpc_network.name
  project = "gnomadev"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["gnomad-lr-data"]
}

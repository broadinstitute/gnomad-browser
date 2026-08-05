resource "google_cloud_run_v2_service" "api" {
  name                = "gnomad-lr-api"
  location            = "us-east1"
  project             = "gnomadev"
  deletion_protection = false

  template {
    service_account = google_service_account.gnomad_lr_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    vpc_access {
      network_interfaces {
        network    = data.google_compute_network.vpc_network.name
        subnetwork = data.google_compute_subnetwork.vpc_subnetwork.name
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${local.api_image_name}@${var.api_image_digest}"

      ports {
        container_port = 8000
      }

      # This checked map deliberately decouples full-genome ClickHouse
      # (192.168.0.124) from the managed Redis instance (10.252.0.3).
      dynamic "env" {
        for_each = local.full_genome_api_env
        content {
          name  = env.key
          value = env.value
        }
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "8Gi"
        }
      }

      startup_probe {
        http_get {
          path = "/health/ready"
          port = 8000
        }
        initial_delay_seconds = 0
        period_seconds        = 2
        failure_threshold     = 60
      }
    }
  }
}

resource "google_cloud_run_v2_service" "browser" {
  name                = "gnomad-lr-browser"
  location            = "us-east1"
  project             = "gnomadev"
  deletion_protection = false

  template {
    service_account = google_service_account.gnomad_lr_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    vpc_access {
      network_interfaces {
        network    = data.google_compute_network.vpc_network.name
        subnetwork = data.google_compute_subnetwork.vpc_subnetwork.name
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = "${local.browser_image_name}@${var.browser_image_digest}"

      ports {
        container_port = 80
      }

      env {
        name  = "API_URL"
        value = "${google_cloud_run_v2_service.api.uri}/api/"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }
  depends_on = [google_cloud_run_v2_service.api]
}

# --- Public Access ---
resource "google_cloud_run_service_iam_member" "api_public" {
  location = google_cloud_run_v2_service.api.location
  project  = google_cloud_run_v2_service.api.project
  service  = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "browser_public" {
  location = google_cloud_run_v2_service.browser.location
  project  = google_cloud_run_v2_service.browser.project
  service  = google_cloud_run_v2_service.browser.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

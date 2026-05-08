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
      image = "${local.api_image_name}@${data.docker_registry_image.api.sha256_digest}"

      ports {
        container_port = 8000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "CLICKHOUSE_URL"
        value = "http://${google_compute_instance.clickhouse_vm.network_interface.0.network_ip}:8123"
      }
      env {
        name  = "ELASTICSEARCH_URL"
        value = var.es_proxy_url
      }
      env {
        name  = "REDIS_HOST"
        value = google_compute_instance.clickhouse_vm.network_interface.0.network_ip
      }
      env {
        name  = "CACHE_REDIS_URL"
        value = "redis://${google_compute_instance.clickhouse_vm.network_interface.0.network_ip}:6379/1"
      }
      env {
        name  = "RATE_LIMITER_REDIS_URL"
        value = "redis://${google_compute_instance.clickhouse_vm.network_interface.0.network_ip}:6379/2"
      }
      env {
        name  = "NODE_OPTIONS"
        value = "--max-old-space-size=6144"
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
      image = "${local.browser_image_name}@${data.docker_registry_image.browser.sha256_digest}"

      ports {
        container_port = 80
      }

      env {
        name  = "API_URL"
        value = "${google_cloud_run_v2_service.api.uri}/api"
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

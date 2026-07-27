data "google_compute_network" "vpc" {
  name    = var.network_name
  project = var.project_id
}

data "google_compute_subnetwork" "subnet" {
  name    = var.subnetwork_name
  project = var.project_id
  region  = var.region
}

data "google_storage_bucket" "source_mirror" {
  name = var.source_mirror_bucket_name
}

resource "google_service_account" "y1" {
  project      = var.project_id
  account_id   = "gnomad-lr-y1-loader"
  display_name = "gnomAD LR Y1 demo loader"
}

resource "google_project_iam_member" "logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.y1.email}"
}

resource "google_project_iam_member" "monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.y1.email}"
}

resource "google_storage_bucket" "reports" {
  name                        = var.report_bucket_name
  project                     = var.project_id
  location                    = "US-EAST1"
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket_iam_member" "report_writer" {
  bucket = google_storage_bucket.reports.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.y1.email}"
}

resource "google_storage_bucket_iam_member" "source_reader" {
  bucket = data.google_storage_bucket.source_mirror.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.y1.email}"
}

resource "google_compute_disk" "data" {
  name    = "${var.instance_name}-data"
  project = var.project_id
  zone    = var.zone
  size    = var.data_disk_size_gb
  type    = var.data_disk_type

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_compute_instance" "clickhouse" {
  name         = var.instance_name
  project      = var.project_id
  zone         = var.zone
  machine_type = var.machine_type

  allow_stopping_for_update = true
  deletion_protection       = true

  service_account {
    email  = google_service_account.y1.email
    scopes = ["cloud-platform"]
  }

  network_interface {
    network    = data.google_compute_network.vpc.self_link
    subnetwork = data.google_compute_subnetwork.subnet.self_link
    # Deliberately no access_config: this VM has no public IP. Private Google
    # Access and the dedicated NAT below provide package and GCS egress.
  }

  boot_disk {
    auto_delete = true
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = var.boot_disk_size_gb
      type  = "pd-balanced"
    }
  }

  attached_disk {
    source      = google_compute_disk.data.self_link
    device_name = "clickhouse-data"
  }

  metadata = {
    startup-script = templatefile("${path.module}/startup.sh.tftpl", {
      clickhouse_version = var.clickhouse_version
    })
    enable-logging    = "true"
    enable-monitoring = "true"
  }

  tags = ["gnomad-lr-y1-clickhouse"]

  lifecycle {
    precondition {
      condition     = var.data_disk_size_gb >= 200
      error_message = "The Y1 demo data disk must be at least 200 GB."
    }
  }
}

resource "google_compute_router" "y1" {
  name    = "gnomad-lr-y1-router"
  project = var.project_id
  region  = var.region
  network = data.google_compute_network.vpc.self_link
}

resource "google_compute_router_nat" "y1" {
  name                               = "gnomad-lr-y1-nat"
  project                            = var.project_id
  region                             = var.region
  router                             = google_compute_router.y1.name
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = data.google_compute_subnetwork.subnet.self_link
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}

resource "google_compute_firewall" "iap_ssh" {
  name    = "gnomad-lr-y1-allow-iap-ssh"
  project = var.project_id
  network = data.google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["gnomad-lr-y1-clickhouse"]
}

resource "google_compute_firewall" "clickhouse_private" {
  count   = length(var.clickhouse_source_ranges) == 0 ? 0 : 1
  name    = "gnomad-lr-y1-allow-clickhouse-private"
  project = var.project_id
  network = data.google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["8123"]
  }

  source_ranges = var.clickhouse_source_ranges
  target_tags   = ["gnomad-lr-y1-clickhouse"]
}

resource "google_compute_resource_policy" "daily_snapshot" {
  name    = "gnomad-lr-y1-daily-snapshot"
  project = var.project_id
  region  = var.region

  snapshot_schedule_policy {
    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = "05:00"
      }
    }

    retention_policy {
      max_retention_days    = 14
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    snapshot_properties {
      storage_locations = [var.region]
      guest_flush       = false
      labels = {
        dataset = "gnomad-lr-y1"
        purpose = "demo"
      }
    }
  }
}

resource "google_compute_disk_resource_policy_attachment" "daily_snapshot" {
  name    = google_compute_resource_policy.daily_snapshot.name
  project = var.project_id
  zone    = var.zone
  disk    = google_compute_disk.data.name
}

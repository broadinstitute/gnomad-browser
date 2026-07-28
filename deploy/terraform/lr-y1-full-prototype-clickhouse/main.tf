locals {
  resource_labels = {
    dataset = "gnomad-lr-y1"
    purpose = "full-prototype"
  }
  clickhouse_tag = "gnomad-lr-y1-full-prototype-clickhouse"
}

# Shared singleton resources are lookups only. This isolated state must never
# own the VPC or either bucket.
data "google_compute_network" "shared" {
  name    = var.network_name
  project = var.project_id
}

data "google_storage_bucket" "source_mirror" {
  name = var.source_mirror_bucket_name
}

data "google_storage_bucket" "evidence" {
  name = var.evidence_bucket_name
}

resource "google_compute_subnetwork" "full_prototype" {
  name                     = var.subnet_name
  project                  = var.project_id
  region                   = var.region
  network                  = data.google_compute_network.shared.self_link
  ip_cidr_range            = var.subnet_cidr
  private_ip_google_access = true

  description = "Isolated full-genome prototype ClickHouse and worker-pool subnet"
}

resource "google_compute_router" "full_prototype" {
  name    = "gnomad-lr-y1-full-prototype-router"
  project = var.project_id
  region  = var.region
  network = data.google_compute_network.shared.self_link
}

resource "google_compute_router_nat" "full_prototype" {
  name                               = "gnomad-lr-y1-full-prototype-nat"
  project                            = var.project_id
  region                             = var.region
  router                             = google_compute_router.full_prototype.name
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.full_prototype.self_link
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}

resource "google_service_account" "clickhouse" {
  project      = var.project_id
  account_id   = "lr-y1-full-proto-ch"
  display_name = "gnomAD LR Y1 full-prototype ClickHouse"
  description  = "Dedicated identity for the isolated full-prototype ClickHouse VM"
}

resource "google_service_account" "worker" {
  project      = var.project_id
  account_id   = "lr-y1-full-proto-worker"
  display_name = "gnomAD LR Y1 full-prototype workers"
  description  = "Dedicated identity for the isolated 128-worker full-prototype pool"
}

resource "google_service_account" "coordinator" {
  project      = var.project_id
  account_id   = "lr-y1-full-proto-coord"
  display_name = "gnomAD LR Y1 full-prototype coordinator"
  description  = "Dedicated identity for scaling the isolated full-prototype worker pool"
}

# These member resources are additive bindings on the existing project IAM
# policy. They do not replace or take ownership of any role's complete policy.
resource "google_project_iam_member" "clickhouse_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.clickhouse.email}"
}

resource "google_project_iam_member" "clickhouse_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.clickhouse.email}"
}

# The coordinator alone can create/list/stop/delete pool VMs. The predefined
# instanceAdmin role is the narrowest Google-managed role covering that scaling
# lifecycle; it does not grant permission to impersonate a VM identity.
resource "google_project_iam_member" "coordinator_instance_admin" {
  project = var.project_id
  role    = "roles/compute.instanceAdmin.v1"
  member  = "serviceAccount:${google_service_account.coordinator.email}"
}

# Restrict actAs to this dedicated worker identity rather than granting the
# coordinator Service Account User across the project.
resource "google_service_account_iam_member" "coordinator_act_as_worker" {
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.coordinator.email}"
}

# These member resources are additive bindings on existing bucket IAM policies.
# ClickHouse and workers can inspect immutable inputs; only the coordinator can
# mutate pool state, conditionally restricted to the dedicated object prefix.
resource "google_storage_bucket_iam_member" "clickhouse_source_reader" {
  bucket = data.google_storage_bucket.source_mirror.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.clickhouse.email}"
}

resource "google_storage_bucket_iam_member" "clickhouse_evidence_writer" {
  bucket = data.google_storage_bucket.evidence.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.clickhouse.email}"
}

resource "google_storage_bucket_iam_member" "worker_source_reader" {
  bucket = data.google_storage_bucket.source_mirror.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.worker.email}"
}

# The coordinator downloads staged binaries and maintains the configured ops.db
# backup. The IAM condition limits mutating access to this prototype's objects.
resource "google_storage_bucket_iam_member" "coordinator_pool_ops_object_user" {
  bucket = data.google_storage_bucket.source_mirror.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.coordinator.email}"

  condition {
    title       = "full_genome_128_pool_ops_only"
    description = "Restrict coordinator mutation to its dedicated pool state and staged binaries"
    expression  = "resource.name.startsWith(\"projects/_/buckets/${data.google_storage_bucket.source_mirror.name}/objects/pool-ops/full-genome-128/\")"
  }
}

resource "google_compute_address" "clickhouse" {
  name         = "${var.instance_name}-ip"
  project      = var.project_id
  region       = var.region
  address_type = "INTERNAL"
  subnetwork   = google_compute_subnetwork.full_prototype.self_link
  labels       = local.resource_labels
}

resource "google_compute_disk" "data" {
  name    = "${var.instance_name}-data"
  project = var.project_id
  zone    = var.zone
  size    = var.data_disk_size_gb
  type    = "pd-balanced"
  labels  = local.resource_labels

  lifecycle {
    prevent_destroy = true
  }
}

# Capture the pristine disk before it is attached or formatted. This is not a
# clone or restore of either existing ClickHouse disk.
resource "google_compute_snapshot" "bootstrap" {
  name              = "${var.instance_name}-bootstrap"
  project           = var.project_id
  source_disk       = google_compute_disk.data.id
  storage_locations = [var.region]
  labels            = local.resource_labels

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_compute_instance" "clickhouse" {
  name         = var.instance_name
  project      = var.project_id
  zone         = var.zone
  machine_type = var.machine_type
  labels       = local.resource_labels
  tags         = [local.clickhouse_tag]

  allow_stopping_for_update = true
  deletion_protection       = true

  service_account {
    email  = google_service_account.clickhouse.email
    scopes = ["cloud-platform"]
  }

  network_interface {
    network_ip = google_compute_address.clickhouse.address
    subnetwork = google_compute_subnetwork.full_prototype.self_link
    # No access_config: this instance has no public IP. Dedicated Cloud NAT is
    # the only general egress path.
  }

  boot_disk {
    auto_delete = true
    initialize_params {
      image  = "debian-cloud/debian-12"
      size   = var.boot_disk_size_gb
      type   = "pd-balanced"
      labels = local.resource_labels
    }
  }

  attached_disk {
    source      = google_compute_disk.data.self_link
    device_name = "clickhouse-data"
  }

  metadata = {
    startup-script = templatefile("${path.module}/startup.sh.tftpl", {
      clickhouse_version = var.clickhouse_version
      private_cidr       = var.subnet_cidr
    })
    enable-logging    = "true"
    enable-monitoring = "true"
  }

  depends_on = [google_compute_snapshot.bootstrap]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_compute_firewall" "iap_ssh" {
  name    = "gnomad-lr-y1-full-prototype-allow-iap-ssh"
  project = var.project_id
  network = data.google_compute_network.shared.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = [local.clickhouse_tag]
}

resource "google_compute_firewall" "pool_iap_ssh" {
  name    = "gnomad-lr-y1-full-prototype-allow-pool-iap-ssh"
  project = var.project_id
  network = data.google_compute_network.shared.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_service_accounts = [
    google_service_account.coordinator.email,
    google_service_account.worker.email,
  ]
}

resource "google_compute_firewall" "coordinator_private" {
  name    = "gnomad-lr-y1-full-prototype-allow-coordinator"
  project = var.project_id
  network = data.google_compute_network.shared.name

  allow {
    protocol = "tcp"
    ports    = ["3000"]
  }

  source_service_accounts = [google_service_account.worker.email]
  target_service_accounts = [google_service_account.coordinator.email]
}

resource "google_compute_firewall" "clickhouse_private" {
  name    = "gnomad-lr-y1-full-prototype-allow-clickhouse"
  project = var.project_id
  network = data.google_compute_network.shared.name

  allow {
    protocol = "tcp"
    ports    = ["8123"]
  }

  # The network path requires both ends of the dedicated integration: only the
  # dedicated worker identity can originate traffic, and only the dedicated
  # ClickHouse identity is targeted. ClickHouse also restricts its user to /24.
  source_service_accounts = [google_service_account.worker.email]
  target_service_accounts = [google_service_account.clickhouse.email]
}

resource "google_compute_resource_policy" "daily_snapshot" {
  name    = "gnomad-lr-y1-full-prototype-daily-snapshot"
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
      max_retention_days    = var.snapshot_retention_days
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    snapshot_properties {
      storage_locations = [var.region]
      guest_flush       = false
      labels            = local.resource_labels
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_compute_disk_resource_policy_attachment" "daily_snapshot" {
  name    = google_compute_resource_policy.daily_snapshot.name
  project = var.project_id
  zone    = var.zone
  disk    = google_compute_disk.data.name
}

resource "google_compute_disk" "clickhouse_data" {
  name    = "gnomad-lr-clickhouse-data-pd"
  project = "gnomadev"
  zone    = "us-east1-c"
  size    = 200
  type    = "pd-ssd"
}

resource "google_compute_instance" "clickhouse_vm" {
  name         = "gnomad-lr-data-vm"
  machine_type = "e2-standard-4"
  zone         = "us-east1-c"
  project      = "gnomadev"

  allow_stopping_for_update = true

  service_account {
    email  = google_service_account.gnomad_lr_sa.email
    scopes = ["cloud-platform"]
  }

  network_interface {
    network    = data.google_compute_network.vpc_network.self_link
    subnetwork = data.google_compute_subnetwork.vpc_subnetwork.self_link
    access_config {
      // Ephemeral public IP — needed for apt-get and GCS access
    }
  }

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
      type  = "pd-ssd"
    }
    auto_delete = true
  }

  attached_disk {
    source = google_compute_disk.clickhouse_data.self_link
  }

  metadata = {
    startup-script    = file("${path.module}/startup.sh")
    enable-logging    = "true"
    enable-monitoring = "true"
  }

  tags = ["gnomad-lr-data"]
}

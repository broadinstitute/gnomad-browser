output "instance_name" {
  value = google_compute_instance.clickhouse.name
}

output "internal_ip" {
  value = google_compute_address.clickhouse.address
}

output "subnet_name" {
  value = google_compute_subnetwork.full_prototype.name
}

output "subnet_cidr" {
  value = google_compute_subnetwork.full_prototype.ip_cidr_range
}

output "clickhouse_service_account" {
  value = google_service_account.clickhouse.email
}

output "worker_service_account" {
  value = google_service_account.worker.email
}

output "coordinator_service_account" {
  value = google_service_account.coordinator.email
}

output "data_disk_name" {
  value = google_compute_disk.data.name
}

output "data_disk_size_gb" {
  value = google_compute_disk.data.size
}

output "bootstrap_snapshot" {
  value = google_compute_snapshot.bootstrap.name
}

output "iap_tunnel_command" {
  value = "gcloud compute ssh ${google_compute_instance.clickhouse.name} --project=${var.project_id} --zone=${var.zone} --tunnel-through-iap -- -L 8126:localhost:8123 -N"
}

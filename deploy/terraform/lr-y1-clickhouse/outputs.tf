output "instance_name" {
  value = google_compute_instance.clickhouse.name
}

output "internal_ip" {
  value = google_compute_instance.clickhouse.network_interface[0].network_ip
}

output "service_account" {
  value = google_service_account.y1.email
}

output "data_disk_size_gb" {
  value = google_compute_disk.data.size
}

output "iap_tunnel_command" {
  value = "gcloud compute ssh ${google_compute_instance.clickhouse.name} --project=${var.project_id} --zone=${var.zone} --tunnel-through-iap -- -L 8126:localhost:8123 -N"
}

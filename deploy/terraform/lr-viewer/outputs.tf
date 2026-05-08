output "browser_url" {
  value = google_cloud_run_v2_service.browser.uri
}

output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "clickhouse_internal_ip" {
  value = google_compute_instance.clickhouse_vm.network_interface.0.network_ip
}

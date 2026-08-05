output "host" {
  description = "Private Redis endpoint on gnomad-v4-dev."
  value       = google_redis_instance.gnomad_lr.host
}

output "port" {
  description = "Redis TCP port."
  value       = google_redis_instance.gnomad_lr.port
}

output "cache_redis_url" {
  description = "Future Cloud Run cache configuration (not applied by this root)."
  value       = "redis://${google_redis_instance.gnomad_lr.host}:${google_redis_instance.gnomad_lr.port}/1"
}

output "rate_limiter_redis_url" {
  description = "Future Cloud Run rate-limiter configuration (not applied by this root)."
  value       = "redis://${google_redis_instance.gnomad_lr.host}:${google_redis_instance.gnomad_lr.port}/2"
}

output "state_prefix" {
  description = "Independent GCS Terraform state prefix."
  value       = "gs://gnomadev-terraform-state/lr-redis/default.tfstate"
}

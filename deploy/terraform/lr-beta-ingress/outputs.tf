output "ipv4_address" {
  description = "Reserved Premium global IPv4, available only after an approved apply."
  value       = google_compute_global_address.beta.address
}

output "bits_dns_record" {
  description = "Actual BITS A-record handoff after apply. Suggested initial TTL 300; no DNS is managed here."
  value       = "${local.hostname}. 300 IN A ${google_compute_global_address.beta.address}"
}

output "bits_dns_request" {
  description = "Structured DNS request after apply; do not add AAAA or CNAME for this IPv4-only frontend."
  value = {
    name = "${local.hostname}."
    type = "A"
    ttl  = 300
    data = google_compute_global_address.beta.address
  }
}

output "url" {
  description = "Intended URL, NOT evidence of TLS or application readiness."
  value       = "https://${local.hostname}"
}

output "certificate_name" {
  description = "Compute managed certificate; check managed.status and domainStatus after DNS activation."
  value       = google_compute_managed_ssl_certificate.beta.name
}

output "backend_service_name" {
  value = google_compute_backend_service.browser.name
}

output "security_policy_name" {
  value = google_compute_security_policy.beta.name
}

output "readiness_limitations" {
  value = "Apply creates infrastructure, not launch readiness. BITS DNS + certificate ACTIVE + end-to-end app/WAF tests are required. Existing public Run/tagged URLs bypass this WAF; Run ingress/IAM remain unchanged. SQLi/XSS are preview-only."
}

terraform {
  required_version = ">= 1.5.7, < 2.0.0"

  backend "gcs" {
    bucket = "gnomadev-terraform-state"
    prefix = "lr-beta-ingress"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.30.0"
    }
  }
}

provider "google" {
  project = "gnomadev"
  region  = "us-east1"
}

locals {
  hostname = "long-read-beta.gnomad.broadinstitute.org"
  prefix   = "gnomad-lr-beta"
}

resource "google_compute_global_address" "beta" {
  name         = "${local.prefix}-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"

  # Global external IPv4 is Premium tier. Preserve the address handed to BITS.
  lifecycle {
    prevent_destroy = true
  }
}

# Reference the existing service by name only: no Run resource/data source,
# IAM, ingress, revision, environment or traffic management in this state.
resource "google_compute_region_network_endpoint_group" "browser" {
  name                  = "${local.prefix}-browser-neg"
  region                = "us-east1"
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = "gnomad-lr-browser"
  }
}

resource "google_compute_security_policy" "beta" {
  name        = "${local.prefix}-armor"
  description = "Dedicated LR beta policy; preview signatures and modest per-IP throttling."
  type        = "CLOUD_ARMOR"

  # Observe low-sensitivity signatures first: GraphQL payloads can false-positive.
  rule {
    priority    = 1000
    action      = "deny(403)"
    preview     = true
    description = "Preview SQLi sensitivity 1; do not enforce without GraphQL testing."
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})"
      }
    }
  }

  rule {
    priority    = 1001
    action      = "deny(403)"
    preview     = true
    description = "Preview XSS sensitivity 1; do not enforce without GraphQL testing."
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 1})"
      }
    }
  }

  rule {
    priority    = 2000
    action      = "throttle"
    preview     = false
    description = "600 requests/minute/client IP; excess 429, no ban. Review shared-NAT use."
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 600
        interval_sec = 60
      }
    }
  }

  rule {
    priority    = 2147483647
    action      = "allow"
    preview     = false
    description = "Required default; no production geo/ASN deny lists."
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

resource "google_compute_backend_service" "browser" {
  name                  = "${local.prefix}-browser-backend"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.beta.id

  # Serverless NEGs do not use VM health checks or configurable backend timeouts.
  backend {
    group = google_compute_region_network_endpoint_group.browser.id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_managed_ssl_certificate" "beta" {
  name = "${local.prefix}-cert"
  managed {
    domains = [local.hostname]
  }
}

resource "google_compute_url_map" "https" {
  name = "${local.prefix}-https"

  # Unknown hosts never serve the application. Fixed canonical destination,
  # fixed root path, no query reflection; scheme remains HTTPS on this proxy.
  default_url_redirect {
    host_redirect          = local.hostname
    path_redirect          = "/"
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = true
  }

  host_rule {
    hosts        = [local.hostname]
    path_matcher = "browser"
  }

  path_matcher {
    name            = "browser"
    default_service = google_compute_backend_service.browser.id
  }

  test {
    host    = local.hostname
    path    = "/"
    service = google_compute_backend_service.browser.id
  }
  test {
    host    = local.hostname
    path    = "/api/"
    service = google_compute_backend_service.browser.id
  }
  test {
    host    = local.hostname
    path    = "/gene/ENSG00000139618"
    service = google_compute_backend_service.browser.id
  }
}

resource "google_compute_url_map" "http" {
  name = "${local.prefix}-http-redirect"

  # Arbitrary HTTP Host headers cannot become open redirects or reach Run.
  default_url_redirect {
    host_redirect          = local.hostname
    path_redirect          = "/"
    https_redirect         = true
    redirect_response_code = "PERMANENT_REDIRECT"
    strip_query            = true
  }

  host_rule {
    hosts        = [local.hostname]
    path_matcher = "https-redirect"
  }

  path_matcher {
    name = "https-redirect"
    default_url_redirect {
      host_redirect          = local.hostname
      https_redirect         = true
      redirect_response_code = "PERMANENT_REDIRECT"
      strip_query            = false
    }
  }

  test {
    host                            = local.hostname
    path                            = "/gene/ENSG00000139618"
    expected_output_url             = "https://${local.hostname}/gene/ENSG00000139618"
    expected_redirect_response_code = 308
  }
  test {
    host                            = "unrecognized.invalid"
    path                            = "/anything"
    expected_output_url             = "https://${local.hostname}/"
    expected_redirect_response_code = 308
  }
}

resource "google_compute_target_https_proxy" "beta" {
  name             = "${local.prefix}-https-proxy"
  url_map          = google_compute_url_map.https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.beta.id]
}

resource "google_compute_target_http_proxy" "beta" {
  name    = "${local.prefix}-http-proxy"
  url_map = google_compute_url_map.http.id
}

resource "google_compute_global_forwarding_rule" "https" {
  name                  = "${local.prefix}-https"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.beta.address
  ip_protocol           = "TCP"
  port_range            = "443"
  network_tier          = "PREMIUM"
  target                = google_compute_target_https_proxy.beta.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${local.prefix}-http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.beta.address
  ip_protocol           = "TCP"
  port_range            = "80"
  network_tier          = "PREMIUM"
  target                = google_compute_target_http_proxy.beta.id
}

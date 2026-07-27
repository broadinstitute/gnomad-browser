terraform {
  backend "gcs" {
    bucket = "gnomadev-terraform-state"
    prefix = "lr-y1-clickhouse"
  }
}

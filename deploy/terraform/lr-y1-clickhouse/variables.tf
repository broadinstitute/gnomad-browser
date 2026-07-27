variable "project_id" {
  type        = string
  description = "GCP project for the Y1 demo instance."
  default     = "gnomadev"
}

variable "region" {
  type    = string
  default = "us-east1"
}

variable "zone" {
  type    = string
  default = "us-east1-c"
}

variable "network_name" {
  type    = string
  default = "gnomad-v4-dev"
}

variable "subnetwork_name" {
  type    = string
  default = "gnomad-v4-dev-main"
}

variable "instance_name" {
  type    = string
  default = "gnomad-lr-y1-clickhouse"
}

variable "machine_type" {
  type        = string
  description = "Right-sized for a low-traffic demo; resize after measured 10 kb and 1 Mb loads."
  default     = "e2-standard-4"
}

variable "boot_disk_size_gb" {
  type    = number
  default = 30
}

variable "data_disk_size_gb" {
  type        = number
  description = "Data disks can be expanded online but cannot be shrunk."
  default     = 300
}

variable "data_disk_type" {
  type        = string
  description = "pd-balanced is sufficient for the demo and substantially cheaper than pd-ssd."
  default     = "pd-balanced"
}

variable "clickhouse_version" {
  type        = string
  description = "Pinned ClickHouse package version; currently matches the legacy demo instance."
  default     = "26.3.9.8"
}

variable "clickhouse_source_ranges" {
  type        = list(string)
  description = "Private CIDRs allowed to reach ClickHouse. Leave empty until a pilot API is provisioned."
  default     = []
}

variable "source_mirror_bucket_name" {
  type        = string
  description = "Owned bucket containing generation-pinned Y1 pilot source mirrors."
  default     = "gnomad-lr-data"
}

variable "report_bucket_name" {
  type    = string
  default = "gnomad-lr-y1-reports"
}

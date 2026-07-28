variable "project_id" {
  type        = string
  description = "GCP project for the isolated full-genome prototype."
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
  type        = string
  description = "Existing shared VPC, referenced read-only as a data source."
  default     = "gnomad-v4-dev"
}

variable "subnet_name" {
  type    = string
  default = "gnomad-lr-y1-full-prototype"
}

variable "subnet_cidr" {
  type        = string
  description = "Dedicated full-prototype VM/worker CIDR; deliberately outside the chr22 192.168.0.0/20 allowlist."
  default     = "192.168.16.0/23"

  validation {
    condition     = var.subnet_cidr == "192.168.16.0/23"
    error_message = "The reviewed isolated subnet is 192.168.16.0/23, outside the chr22 192.168.0.0/20 allowlist."
  }
}

variable "instance_name" {
  type    = string
  default = "gnomad-lr-y1-full-prototype-clickhouse"
}

variable "machine_type" {
  type    = string
  default = "n2-highmem-32"
}

variable "boot_disk_size_gb" {
  type    = number
  default = 50
}

variable "data_disk_size_gb" {
  type        = number
  description = "Expandable prototype data disk; persistent disks cannot be shrunk."
  default     = 2000

  validation {
    condition     = var.data_disk_size_gb >= 2000
    error_message = "The full-genome prototype data disk must be at least 2 TB."
  }
}

variable "clickhouse_version" {
  type        = string
  description = "Pinned package version matching the accepted chr22 instance."
  default     = "26.3.9.8"
}

variable "source_mirror_bucket_name" {
  type        = string
  description = "Existing generation-pinned source mirror; never managed by this state."
  default     = "gnomad-lr-data"
}

variable "evidence_bucket_name" {
  type        = string
  description = "Existing prototype evidence bucket; never managed by this state."
  default     = "gnomad-lr-y1-reports"
}

variable "snapshot_retention_days" {
  type    = number
  default = 30
}

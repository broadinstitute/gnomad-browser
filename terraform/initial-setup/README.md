# Initial setup (do the steps below before running commands in the `terraform` directory)

This directory contains code for initial terraform set up:

- Google storage bucket for remote state
  - deletion protection
  - versioning
  - encryption (GCP does this automatically - at rest)
  - lock files (GCP does this automatically)
- Enable access to GCP APIs required for gnomAD browser

## Instructions:

1) Create a `terraform.tfvars` to ensure variable are correct for your project (see `terraform.tfvars.example` for guidance).
2) `terraform init` to initialise terraform providers (this will require authenticating with `gcloud` if you haven't done yet authenticated).
3) `terraform apply` to create initial setup resources.

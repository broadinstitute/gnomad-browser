variable "frontend_deployer_member" {
  description = "IAM member allowed to manage the existing frontend using operator-approved images; does not grant build or API deployment access."
  type        = string
  default     = "user:weisburd@broadinstitute.org"
}

# Additive grants only: preserve public invocation and all existing IAM members.
# Run Developer includes service deletion. Deployed code inherits the runtime
# service account's existing privileges; this is not an update-only sandbox.
resource "google_cloud_run_service_iam_member" "frontend_deployer" {
  project  = google_cloud_run_v2_service.browser.project
  location = google_cloud_run_v2_service.browser.location
  service  = google_cloud_run_v2_service.browser.name
  role     = "roles/run.developer"
  member   = var.frontend_deployer_member
}

resource "google_service_account_iam_member" "frontend_deployer_act_as" {
  service_account_id = google_service_account.gnomad_lr_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = var.frontend_deployer_member
}

# The repository already exists outside this root. Manage only this member,
# not the repository or its policy. Read access covers all images in the repo.
resource "google_artifact_registry_repository_iam_member" "frontend_deployer_images" {
  project    = "gnomadev"
  location   = "us"
  repository = "gnomad"
  role       = "roles/artifactregistry.reader"
  member     = var.frontend_deployer_member
}

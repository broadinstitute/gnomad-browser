# Creating a new deployment

## Configure project

- [Create a Cloud Monitoring workspace for the project](https://cloud.google.com/monitoring/workspaces/guide#single-project-ws).

## Create GCP resources

Creating the base GCP resources (GKE cluster, GCS buckets, VPC networks, service accounts) is done via the [gnomad-vpc](https://github.com/broadinstitute/tgg-terraform-modules/tree/main/gnomad-vpc) and [gnomad-browser-infra](https://github.com/broadinstitute/tgg-terraform-modules/tree/main/gnomad-browser-infra) terraform modules.

If you are simply deploying a new browser app instance, and don't need to provision infrastructure, you can skip this step.

Example configurations for those two modules are as follows. If you are creating a new persistent / production environment at Broad, please follow our conventions in [gnomad-terraform](https://github.com/broadinstitute/gnomad-terraform).

```hcl
module "gnomad-browser-vpc" {
  source              = "github.com/broadinstitute/tgg-terraform-modules//gnomad-vpc?ref=main"
  network_name_prefix = "gnomad-mynetwork"
}

module "gnomad-browser-infra" {
  source                                = "github.com/broadinstitute/tgg-terraform-modules//gnomad-browser-infra?ref=main"
  infra_prefix                          = "gnomad-mybrowser"
  vpc_network_name                      = "gnomad-mynetwork"
  vpc_subnet_name                       = "gnomad-mynetwork-gke"
  project_id                            = "my-gcp-project"
  gke_pods_range_slice                  = "10.164.0.0/14"
  gke_services_range_slice              = "10.168.0.0/20"
}
```

Then, run `terraform init` and `terraform apply`.

## Prepare data

See [data-pipeline/README.md](../../data-pipeline/README.md) for information on running data preparation pipelines.

## Deploy on GKE

### Create Elasticsearch cluster

The setup step installs the [Elastic Cloud on Kubernetes (ECK)](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html) operator.

To check if the operator is ready, run `kubectl -n elastic-system get statefulset.apps/elastic-operator`.

Create a kubernetes service account to use for elasticsearch snapshotting, run: `kubectl create serviceaccount es-snaps`

Annotate that service account to associate it with the GCP Service Account that can write to your snapthot storage:

```
  kubectl annotate sa es-snaps iam.gke.io/gcp-service-account=your-service-acct@your-project.iam.gserviceaccount.com
```

To create an Elasticsearch cluster, run `./deployctl elasticsearch apply`.

After creating the cluster, store the password in a secret so that Dataproc jobs can access it.

### Create browser deployment

- Configure browser build.

  All values are optional.

  Providing a value for `GA_TRACKING_ID` causes the browser to use Google Analytics.

  The `REPORT_VARIANT_*` options control the URL for the "Report an issue with this variant" link on the variant page.

  ```
  cat <<EOF > browser/build.env
  GA_TRACKING_ID=
  REPORT_VARIANT_URL=
  REPORT_VARIANT_VARIANT_ID_PARAMETER=
  REPORT_VARIANT_DATASET_PARAMETER=
  EOF
  ```

- Build Docker images and push to GCR.

  ```
  ./deployctl images build --push
  ```

- Create deployment manifests.

  ```
  ./deployctl deployments create
  ```

- Apply deployment.

  ```
  ./deployctl deployments apply <deployment-name>
  ```

### Create reads deployment

- Build Docker images and push to GCR.

  ```
  ./deployctl reads-images build --push
  ```

- Create deployment manifests.

  ```
  ./deployctl reads-deployments create
  ```

- Apply deployment.

  ```
  ./deployctl reads-deployments apply <deployment-name>
  ```

### Create blog deployment

- Create secrets.

  Fill in values from GitHub application.

  ```
  cat <<EOF > oauth-secrets.env
  client-id=
  client-secret=
  EOF
  ```

  ```
  kubectl create secret generic blog-oauth-secrets --from-env-file oauth-secrets.env
  ```

- Build Docker images and push to GCR.

  ```
  ./deployctl blog-images build --push
  ```

- Create deployment manifests.

  ```
  ./deployctl blog-deployment update
  ```

- Apply deployment.

  ```
  ./deployctl blog-deployment apply
  ```

### Create ingress

- Create NodePort services for browser and reads, Ingress, and FrontendConfig.

  The SSL certificate created by `deployctl setup` will only be provisioned after DNS records
  for gnomad.broadinstitute.org are configured to point to the load balancer's IP address.

  See https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs for more information.

  ```
  ./deployctl production apply-ingress
  ```

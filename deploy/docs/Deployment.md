# Deployment

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

# Deploy on GKE

## Create Elasticsearch cluster

First install the operator with the steps as documented: [Elastic Cloud on Kubernetes (ECK)](https://www.elastic.co/guide/en/cloud-on-k8s/2.9/k8s-overview.html).

To check if the operator is ready, run `kubectl -n elastic-system get statefulset.apps/elastic-operator`.

Create a kubernetes service account to use for elasticsearch snapshotting, run: `kubectl create serviceaccount es-snaps`

Annotate that service account to associate it with the GCP Service Account that can write to your snapthot storage:

```
  kubectl annotate sa es-snaps iam.gke.io/gcp-service-account=your-service-acct@your-project.iam.gserviceaccount.com
```

If you are using a custom cluster (e.g. `gnomad-myname`) ensure `environment_tag` in `deployctl_config.json` is set to `myname`.

To create an Elasticsearch cluster, run `./deployctl elasticsearch apply`.

After creating the cluster, store the password in a secret so that Dataproc jobs can access it.

## Deploy Redis

Run kubectl apply -k . in the deploy/manifests/redis folder

## Json Cache

The gnomAD API has an optional JSON cache for elasticsearch lookups. The cache client can write to local directories or Google Cloud Storage and files can be gzipped or not.

### Environment variables:

Should be set when running the API server.

`JSON_CACHE_PATH`

+ Description: Specifies the directory path where JSON files should be written.
+ Usage: If this path includes gs://, the system will utilize Google Cloud Storage (GCS) for storing the JSON files. Otherwise, it defaults to using local file storage.
+ Example Value: /path/to/cache or gs://bucket_name/path/to/cache

`JSON_CACHE_ENABLE_ALL`
+ Description: Determines whether caching is enabled for all Elasticsearch lookups using the withCache function.
+ Usage: Set to true to enable caching for all lookups; otherwise, caching is disabled.
+ Example Value: true or false

`JSON_CACHE_LARGE_GENES`
+ Description: Controls the caching behavior specifically for large genes.
+ Usage: When set to true, only large genes listed in the `largeGenes.ts` file will be cached. This can be useful for getting extremely large genes like TTN to load.
+ Example Value: true or false

`JSON_CACHE_COMPRESSION`
+ Description: Specifies whether to use compression for the stored JSON files.
+ Usage: Set to true to enable compression, which can save storage space but may increase CPU usage for compression and decompression processes.
+ Example Value: true or false

### Cache invalidation

When data changes, the JSON cache path must be manually invalidated. This can be done by updating the cache path to a new directory.

E.g change `JSON_CACHE_PATH` from `gs://my_json_cache_bucket/release` to `gs://my_json_cache_bucket/release2`.

Cached files can also be copied between buckets as needed.

Or, specific files to be invalidated can be deleted using a glob pattern.

## Before creating a deployment

Before deploying a new version of the browser, either a demo, or to production:

1. Check out the branch you wish to deploy

2. Ensure that the `Docker CLI` is running

3. Ensure you are connected to the Broad's network, either by being in the office, or by use of the non-split VPN

4. Ensure your `deploy_config.json` file points to the correct GCP project

5. Ensure that your `gcloud config` points to the correct GCP project

   - `gcloud config get project` to see your current configs project
   - `gcloud config set project <DESIRED-PROJECT>` to set your configs project

6. Ensure that your `kubectl` config points to the correct cluster
   - `kubectl config get-contexts` to see your configs cluster
   - `kubectl config use-context <DESIRED-CLUSTER>` to set your configs cluster

## Create Demo Browser Deployment

Demo deployments are staging environments independently that let stakeholders preview and approve features before the features go to production.

After a particular demo instance has served its purpose, there are several cleanup steps that should be performed.

There exist several Python scripts in the `deployctl` package that make this process straightforward. These files are located in `gnomad-browser/deploy/deployctl/subcommands`.

### Deploying a demo

0. Double check the [pre-deployment steps](#before-creating-a-deployment)

1. Create and push Docker Images to the [Google Container Registry](https://console.cloud.google.com/gcr/images/exac-gnomad?project=exac-gnomad) with:

   ```
   . /deployctl images build --push --image-tag <OPTIONAL-NAMED-TAG>
   ```

2. Create a local manifest file that describes the deployment with:

   ```
   ./deployctl deployments create --name <DEPLOYMENT_NAME> --browser-tag <BROWSER_IMAGE_TAG> --api-tag <API_IMAGE_TAG>
   ```

- 'Apply' the deployment, assigning pods to run it in the [Google Kubernetes Engine](https://console.cloud.google.com/kubernetes/workload/overview?project=exac-gnomad):

  ```
  ./deployctl deployments apply <DEPLOYMENT_NAME>
  ```

- Apply an ingress, allowing access to the demo via an IP address that gets assigned:

  ```
  ./deployctl demo apply-ingress <DEPLOYMENT_NAME>
  ```

- Check the status of the ingress with:

  ```
  kubectl describe ingress gnomad-ingress-demo-<DEPLOYMENT_NAME>
  ```

It typically takes ~5 minutes for the IP to resolve to the new deployment

**Where:**

- `<BROWSER_IMAGE_TAG>` and `<API_IMAGE_TAG>`
  Are the tags assigned to the docker images, these can be found in the Container Registry, and in your command line when they are created. The script '`deployments create`' names them with the git commit hash, and the git branch name by default. i.e. '`c4baa347-add-team-page`'
  Both of these tags are optional, if one or either are not provided, the most recent images will be used by default.

- `<DEPLOYMENT_NAME>` is what you wish to call the deployment, i.e. '`team-demo`'

### Clean Up Old Demo Deployments

After demo deployments have served their purpose, their resources should be cleaned up.

- Check which deployments are being used in production with:

  ```
  ./deployctl production describe
  ```

- Check all of the current deployments (`local` and `cluster`) with:

  ```
  ./deployctl deployments list
  ```

- Remove `local` deployments with:

  ```
  ./deployctl deployments clean <DEPLOYMENT_NAME>
  ```

- Remove unwanted `cluster` deployments with:

  ```
  ./deployctl deployments delete <DEPLOYMENT_NAME>
  ```

- Check all of the current GKE ingresses with:

  ```
  kubectl get ingress
  ```

- Delete an unwanted ingress with:

  ```
  kubectl delete ingress <INGRESS_NAME>
  ```

## Create and Update Browser Production Deployment

The production gnomad browser uses a [blue/green deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html) pattern. Deploying to production entails creating a new deployment based off the current state of the `main` branch, called "blue" or "green" based of what is currently serving traffic in production, and swapping the production ingress to point to the new blue/green deployment.

### Deploying and updating production

0. Double check the [pre-deployment steps](#before-creating-a-deployment)

   - Production deployments should be based off the state of the `main` branch, and not feature branches, for reproducibility

1. Create and push Docker Images to the [Google Container Registry](https://console.cloud.google.com/gcr/images/exac-gnomad?project=exac-gnomad) with:

   ```
   ./deployctl images build --push
   ```

2. Check all current deployments (both `cluster` pods running and `local` manifests) with:

   ```
   ./deployctl production describe
   ```

3. Check the name (blue/green) of the production deployment currently serving traffic `<DEPLOYMENT_NAME>`

   ```
   ./deployctl production describe
   ```

4. Create a deployment that is the opposite (blue/green) of what is serving traffic in production

   - If the active browser deployment is `blue`, create a new `green` deployment
   - If the active browser deployment is `green`, create a new `blue` deployment

5. Remove the old blue/green deployment not currently serving traffic in production if needed

   - Remove the pods serving the old deployment from the cluster

     ```
     ./deployctl deployments delete <DEPLOYMENT_NAME>
     ```

   - Remove the old local manifest file
     ```
     ./deployctl deployments delete <DEPLOYMENT_NAME>
     ```

6. Create a local blue/green manifest file to describe the deployment:

   ```
   ./deployctl deployments create --name <DEPLOYMENT_NAME> --browser-tag <BROWSER_IMAGE_TAG> --api-tag <API_IMAGE_TAG>
   ```

7. 'Apply' the new deployment, assigning pods to run it in the [Google Kubernetes Engine](https://console.cloud.google.com/kubernetes/workload/overview?project=exac-gnomad):

   ```
   ./deployctl deployments apply <DEPLOYMENT_NAME>
   ```

8. Apply an ingress, allowing access to the pods via an IP address that gets assigned:

   ```
   ./deployctl demo apply-ingress <DEPLOYMENT_NAME>
   ```

   - Check the status of the ingress with:

     ```
     kubectl describe ingress gnomad-ingress-demo-<DEPLOYMENT_NAME>
     ```

     It typically takes ~5 minutes for the IP to resolve to the new deployment

   - Optionally, double check the blue/green deployment via this ingress before swapping production over

9. Update the production deployment

   ```
   ./deployctl production update --browser-deployment <DEPLOYMENT_NAME>
   ```

10. Double check the production deployment updated

    ```
    ./deployctl production describe
    ```

11. When it is clear the new deployment is stable, delete the old blue/green deployment to save resources

    - It is typically useful to leave the old deployment up for a few days, as it makes a rollback very quick to perform. Once it is clear the new deployment is stable, the old deployment can safely be taken down.

      ```
      ./deployctl deployments delete <old-deployment-name>
      ```

**Where:**

- `<BROWSER_IMAGE_TAG>` and `<API_IMAGE_TAG>`
  Are the tags assigned to the docker images, these can be found in the Container Registry, and in your command line when immediately after the images are pushed to the GCR

- `<DEPLOYMENT_NAME>` is either `blue` or `green` depending on the current active browser deployment

## Create and Update Reads Deployment

Create Reads Deployment

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

Update Reads Deployment

- Switch over to the new deployment. This updates the `gnomad-reads` service's selector to point to the new deployment.

  ```
  ./deployctl production update --reads-deployment <new-deployment-name>
  ```

- Delete the old deployment.

  ```
  ./deployctl reads-deployments delete <old-deployment-name>
  ```

## Create and Update Blog Deployment

Create Blog Deployment

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

Update Blog Deployment

- Update deployment manifests.

  ```
  ./deployctl blog-deployment update
  ```

- Apply deployment.

  ```
  ./deployctl blog-deployment apply
  ```

## Create ingress

- Create NodePort services for browser and reads, Ingress, and FrontendConfig.

  The SSL certificate created by `deployctl setup` will only be provisioned after DNS records
  for gnomad.broadinstitute.org are configured to point to the load balancer's IP address.

  See https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs for more information.

  ```
  ./deployctl production apply-ingress
  ```

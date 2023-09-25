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

The setup step installs the [Elastic Cloud on Kubernetes (ECK)](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html) operator.

To check if the operator is ready, run `kubectl -n elastic-system get statefulset.apps/elastic-operator`.

Create a kubernetes service account to use for elasticsearch snapshotting, run: `kubectl create serviceaccount es-snaps`

Annotate that service account to associate it with the GCP Service Account that can write to your snapthot storage:

```
  kubectl annotate sa es-snaps iam.gke.io/gcp-service-account=your-service-acct@your-project.iam.gserviceaccount.com
```

To create an Elasticsearch cluster, run `./deployctl elasticsearch apply`.

After creating the cluster, store the password in a secret so that Dataproc jobs can access it.

## Create Demo Browser Deployment

This is very similar to creating a new deployment (NewDeployment.md), particularly in the browser/api section.

However, there is additional cleanup that should be performed as demo instances are typically temporary, and should be removed after their purpose is served.

There exist several Python scripts in the `deployctl` package that make this process straightforward. These files are located in `gnomad-browser/deploy/deployctl/subcommands`.

### Create Browser/API Demo Deployment

Have the branch you wish to deploy as a demo as the active branch

Ensure that `Docker CLI` is running, and that you are connected to the Broad's network, either by being in the office, or by use of the VPN.

- Create and push Docker Images to the [Google Container Registry](https://console.cloud.google.com/gcr/images/exac-gnomad?project=exac-gnomad) with:

  ```
  ./deployctl images build --push
  ```

- Create a local manifest file that describes the deployment with:

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

In general, it's good to clean up old deployments that are still around after serving their purpose, due to a limited amount of resources in GKE.

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

## Create and Update Browser Deployment

Ensure that `Docker CLI` is running, that you are connected to the Broad's network, either by being in the office, or by use of the VPN, and that kubernetes is configured to the `exac-gnomad` project.

- View your kubernetes configurations

  ```
  kubectl config get-contexts
  ```

- If the current cluster is not pointed to the `exac-gnomad` project

  ```
  kubectl config use-context gke_exac-gnomad_us-east1-c_gnomad-prod
  ```

Have the most updated version of the `main` branch as the active branch

- Create and push Docker Images to the [Google Container Registry](https://console.cloud.google.com/gcr/images/exac-gnomad?project=exac-gnomad) with:

  ```
  ./deployctl images build --push
  ```

    The response of this command should return something like this:

    ```
  Pushed gcr.io/exac-gnomad/gnomad-browser:<BROWSER_IMAGE_TAG>
    Pushed gcr.io/exac-gnomad/gnomad-api:<API_IMAGE_TAG>
  ```

- Determine `<DEPLOYMENT_NAME>`

  ```
  ./deployctl production describe
  ```

  If the active browser deployment is blue then `<DEPLOYMENT_NAME> = green`.
  If the active browser deployment is green then `<DEPLOYMENT_NAME> = blue`.

- Clean local deployments of  `<DEPLOYMENT_NAME>` by viewing the current local deployments:

  ```
  ./deployctl deployments list
  ```

  - If there are `local configurations` of `<DEPLOYMENT_NAME>`:

    ```
    ./deployctl deployments clean <DEPLOYMENT_NAME>
    ```

- Create a local manifest file that describes the deployment with:

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

- Update the production deployment

    ```
    ./deployctl production update --browser-deployment <DEPLOYMENT_NAME>
    ```

- Finally, check that the active browser deployment is the current `<DEPLOYMENT_NAME>`

    ```
    ./deployctl production describe
    ```

- Delete the old deployment.

  ```
  ./deployctl deployments delete <old-deployment-name>
  ```

**Where:**

- `<BROWSER_IMAGE_TAG>` and `<API_IMAGE_TAG>`
Are the tags assigned to the docker images, these can be found in the Container Registry, and in your command line when they are created.

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

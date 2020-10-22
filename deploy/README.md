# Deployment

## Requirements

- Google Cloud SDK

  Instructions for installing and initializing the Google Cloud SDK are available at https://cloud.google.com/sdk/.

- Docker

  Instructions for installing Docker are available at https://docs.docker.com/get-docker/.

  To allow pushing images to GCR, register `gcloud` as a Docker credential helper with `gcloud auth configure-docker`.

- Python dependencies

  `pip install -r deploy/deployctl/requirements.txt`

## Configuration

Select a GCP project and zone to use.

```
./deployctl config set project $PROJECT
./deployctl config set zone $ZONE
```

To see other available configuration options, run `./deployctl config list`.

## Creating a new environment

### Configure project

- [Create a Cloud Monitoring workspace for the project](https://cloud.google.com/monitoring/workspaces/guide#single-project-ws).

### Create GCP resources

```
./deployctl setup
```

### Deploy on GKE

#### Prepare data

See [data-pipeline/README.md](../data-pipeline/README.md) for information on running data preparation pipelines.

#### Create Elasticsearch cluster

The setup step installs the [Elastic Cloud on Kubernetes (ECK)](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html) operator.

To check if the operator is ready, run `kubectl -n elastic-system get statefulset.apps/elastic-operator`.

To create an Elasticsearch cluster, run `./deployctl elasticsearch apply`.

After creating the cluster, store the password in a secret so that Dataproc jobs can access it.

#### Create browser deployment

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

#### Create reads deployment

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

#### Create blog deployment

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

#### Create ingress

- Create NodePort services for browser and reads, certificate, and Ingress.

  The SSL certificate can only be provisioned after DNS records for gnomad.broadinstitute.org are configured to
  point to the load balancer's IP address.

  See https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs for more information.

  ```
  ./deployctl production apply-ingress
  ```

## Updating an existing environment

### Updating browser deployment

- Follow steps above to create a new browser deployment.

- Switch over to the new deployment. This updates the `gnomad-browser` service's selector to point to the new deployment.

  ```
  ./deployctl production update --browser-deployment <new-deployment-name>
  ```

- Delete the old deployment.

  ```
  ./deployctl deployments delete <old-deployment-name>
  ```

### Updating reads deployment

- Follow steps above to create a new reads deployment.

- Switch over to the new deployment. This updates the `gnomad-reads` service's selector to point to the new deployment.

  ```
  ./deployctl production update --reads-deployment <new-deployment-name>
  ```

- Delete the old deployment.

  ```
  ./deployctl reads-deployments delete <old-deployment-name>
  ```

# Creating a new deployment

## Configure project

- [Create a Cloud Monitoring workspace for the project](https://cloud.google.com/monitoring/workspaces/guide#single-project-ws).

## Create GCP resources

```
./deployctl setup
```

## Prepare data

See [data-pipeline/README.md](../../data-pipeline/README.md) for information on running data preparation pipelines.

## Deploy on GKE

### Create Elasticsearch cluster

The setup step installs the [Elastic Cloud on Kubernetes (ECK)](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html) operator.

To check if the operator is ready, run `kubectl -n elastic-system get statefulset.apps/elastic-operator`.

To create an Elasticsearch cluster, run `./deployctl elasticsearch apply`.

After creating the cluster, store the password in a secret so that Dataproc jobs can access it.

### Create browser deployment

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

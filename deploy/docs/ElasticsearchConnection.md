# Connecting to Elasticsearch

- Forward local port to Elasticsearch service.

  ```
  kubectl port-forward service/gnomad-es-http 9200
  ```

  The service name may be different depending on the name of the Elasticsearch cluster.

- Get password from K8S secret.

  ```
  ELASTICSEARCH_PASSWORD=$(./deployctl elasticsearch get-password)
  ```

- Make a request.

  ```
  curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_cluster/health
  ```

## Connecting to Elasticsearch from a Dataproc cluster

- Dataproc clusters must connect to Elasticsearch through the internal load balancer. Get its IP address with:

  ```
  ELASTICSEARCH_IP=$(kubectl get service gnomad-elasticsearch-lb --output=jsonpath="{.status.loadBalancer.ingress[0].ip}")
  ```

- Store the Elasticsearch password in [Secret Manager](https://cloud.google.com/secret-manager/docs).

  ```
  ELASTICSEARCH_PASSWORD=$(./deployctl elasticsearch get-password)
  echo -n "$ELASTICSEARCH_PASSWORD" | gcloud secrets create gnomad-elasticsearch-password --data-file=-
  ```

- Grant the data pipeline service account [access to the secret](https://cloud.google.com/secret-manager/docs/managing-secrets#managing_access_to_secrets).

  ```
  gcloud secrets add-iam-policy-binding gnomad-elasticsearch-password \
    --member="serviceAccount:gnomad-data-pipeline@${PROJECT}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```

- Specify the service account when creating the Dataproc cluster. The secret value can be accessed from the Dataproc cluster using:

  ```
  gcloud secrets versions access latest --secret="gnomad-elasticsearch-password"
  ```

- Make a request.

  ```
  curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://${ELASTICSEARCH_IP}:9200/_cluster/health
  ```

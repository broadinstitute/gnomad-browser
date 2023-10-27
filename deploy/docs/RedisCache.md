# Redis Cache

### Deploying the redis cache

#### Single node

- The configs in the deploy/manifests/redis folder can be deployed with kustomize:

  ```
  cd deploy/manifests/redis
  # ensure your kubectl context is pointed at the desired GKE cluster
  kubectl apply -k .
  ```

#### Clustered

- Provided in this repository is a Helm values file that can deploy a clustered redis with the bitnami/redis Helm chart:

  ```
  helm repo add bitnami https://charts.bitnami.com/bitnami
  helm install redis -f deploy/manifests/redis/redis-values.yaml
  ```

### Connect to Redis cache

- Get the name of the Redis pod.

  ```
  REDIS_POD=$(kubectl get pods --selector=name=redis -o=name)
  ```

- Get a shell in the Redis pod.

  ```
  kubectl exec -ti $REDIS_POD -- /bin/bash
  ```

- Run Redis CLI.

  ```
  redis-cli -n 1
  ```

### Clearing cached values

Use SCAN instead of KEYS to retrieve a list of keys matching a pattern. For example:

```
redis-cli -n 1 --scan --pattern 'variants:*' | xargs redis-cli -n 1 del
```

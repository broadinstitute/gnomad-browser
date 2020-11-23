# Redis Cache

### Connect to Redis cache

- Get the name of the Redis pod.

  ```
  REDIS_POD=$(kubectl get pods --selector=name=redis -o=name)
  ```

- Get a shell in the Redis pod.

  ```
  kubectl exec -ti $REDIS_POD -- /bin/sh
  ```

- Run Redis CLI.

  ```
  redis-cli -n 1
  ```

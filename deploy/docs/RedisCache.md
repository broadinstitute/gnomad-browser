# Redis Cache

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

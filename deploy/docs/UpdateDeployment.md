# Updating an existing environment

## Updating browser deployment

- Follow steps above to create a new browser deployment.

- Switch over to the new deployment. This updates the `gnomad-browser` service's selector to point to the new deployment.

  ```
  ./deployctl production update --browser-deployment <new-deployment-name>
  ```

- Delete the old deployment.

  ```
  ./deployctl deployments delete <old-deployment-name>
  ```

## Updating reads deployment

- Follow steps above to create a new reads deployment.

- Switch over to the new deployment. This updates the `gnomad-reads` service's selector to point to the new deployment.

  ```
  ./deployctl production update --reads-deployment <new-deployment-name>
  ```

- Delete the old deployment.

  ```
  ./deployctl reads-deployments delete <old-deployment-name>
  ```

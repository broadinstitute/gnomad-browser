# Updating an existing environment

## Updating browser deployment

- Follow steps to [create a new browser deployment](./NewDeployment.md#create-browser-deployment).

- Switch over to the new deployment. This updates the `gnomad-browser` service's selector to point to the new deployment.

  ```
  ./deployctl production update --browser-deployment <new-deployment-name>
  ```

- Delete the old deployment.

  ```
  ./deployctl deployments delete <old-deployment-name>
  ```

## Updating reads deployment

- Follow steps to [create a new reads deployment](./NewDeployment.md#create-reads-deployment).

- Switch over to the new deployment. This updates the `gnomad-reads` service's selector to point to the new deployment.

  ```
  ./deployctl production update --reads-deployment <new-deployment-name>
  ```

- Delete the old deployment.

  ```
  ./deployctl reads-deployments delete <old-deployment-name>
  ```

## Updating blog deployment

- Build Docker images and push to GCR.

  ```
  ./deployctl blog-images build --push
  ```

- Update deployment manifests.

  ```
  ./deployctl blog-deployment update
  ```

- Apply deployment.

  ```
  ./deployctl blog-deployment apply
  ```

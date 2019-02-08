# gnomAD Browser Deployment

## Building a Docker image

To build a Docker image containing the app server and its dependencies:

```shell
cd gnomadjs/projects/gnomad
./deploy/build-image.sh
```

This will create an image named "gnomad-browser-beta" tagged with the hash of the current git revision.

## Deploying an image to GKE

After an image has been built, deploy it to Kubernetes with:

```shell
cd gnomadjs/projects/gnomad
./deploy/deploy-image.sh tag environment
```

where `tag` is the tag on the "gnomad-browser-beta" image to be deployed and `environment` is the
environment to deploy to ("p" for production or "d" for development).

This pushes the image with specified tag to GCR and updates the container image in the appropriate
Kubernetes deployment.

## Updating Kubernetes deployment configuration

For other changes to the Kubernetes deployment, such as modifying environment variables, follow this process:

1. Make change to gnomad-deployment YAML files
2. Submit pull request for review
3. After approval, apply changes with `kubectl apply -f file`
4. Verify changes area working as expected
5. Merge pull request

## Running locally

To run the browser using Docker:

```shell
docker run --rm -ti --init -p 8000:80 gcr.io/exac-gnomad/gnomad-browser-beta
```

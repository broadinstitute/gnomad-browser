# gnomAD Browser Deployment

## Build image

To build a Docker image containing the app server and its dependencies:

```shell
cd gnomadjs/projects/gnomad
./deploy/build-image.sh
```

This will create an image named "gnomad-browser-beta" tagged with the hash of the current git revision.

## Deploy image to Kubernetes

After an image has been built, deploy it to Kubernetes with:

```shell
cd gnomadjs/projects/gnomad
./deploy/deploy-image.sh tag environment
```

where `tag` is the tag on the "gnomad-browser-beta" image to be deployed and `environment` is the
environment to deploy to ("p" for production or "d" for development).

## Run image locally

To run the browser locally from the Docker image:

```shell
docker run --rm -ti --init -p 8000:80 gcr.io/exac-gnomad/gnomad-browser-beta
```

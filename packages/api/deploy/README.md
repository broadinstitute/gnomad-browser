# API Deployment

## Build image

To build a Docker image containing the API server and its dependencies:

```shell
cd gnomadjs/packages/api
./deploy/build-image.sh
```

This will create an image named "gnomad-api" tagged with the hash of the current git revision.

## Deploy image to Kubernetes

After an image has been built, deploy it to Kubernetes with:

```shell
cd gnomadjs/packages/api
./deploy/deploy-image.sh tag
```

where `tag` is the tag on the "gnomad-api" image to be deployed.

## Run image locally

To run the API server in Docker on macOS using a local instance of Mongo and Redis:

```shell
docker run --rm -ti --init \
   -p 8007:80 \
   -e "GRAPHQL_PORT=80" \
   -e "NODE_ENV=development" \
   -e "ELASTICSEARCH_URL=elastic:9200" \
   -e "GNOMAD_MONGO_URL=mongodb://host.docker.internal:27017/exac" \
   -e "REDIS_HOST=host.docker.internal" \
   gcr.io/exac-gnomad/gnomad-api
```

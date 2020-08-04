#!/bin/bash

set -eu

if [[ $# -eq 0 ]]; then
  echo "Usage: deploy-image.sh tag" 1>&2
  exit 1
fi

DEPLOY_TAG=$1

# cd to projects/gnomad-reads directory
DEPLOY_DIR=$(dirname "${BASH_SOURCE}")
cd "${DEPLOY_DIR}/.."

source "../../cluster/config.sh"
IMAGE_NAME="gcr.io/${GCLOUD_PROJECT}/gnomad-reads"

# Push to container registry
docker push ${IMAGE_NAME}:${DEPLOY_TAG}
docker push ${IMAGE_NAME}:latest

# Update deployment
kubectl set image deployment/gnomad-reads app=${IMAGE_NAME}:${DEPLOY_TAG}

# Wait for rollout to finish
kubectl rollout status deployment/gnomad-reads

#!/bin/bash

set -eu

if [[ $# -eq 0 ]]; then
  echo "Usage: deploy-image.sh tag" 1>&2
  exit 1
fi

DEPLOY_TAG=$1

# cd to packages/api directory
DEPLOY_DIR=$(dirname "${BASH_SOURCE}")
cd "${DEPLOY_DIR}/.."

source "../../cluster/config.sh"
IMAGE_NAME="gcr.io/${GCLOUD_PROJECT}/gnomad-api"

# Push to container registry
gcloud docker -- push ${IMAGE_NAME}:${DEPLOY_TAG}
gcloud docker -- push ${IMAGE_NAME}:latest

# Update API deployment
kubectl set image deployment/gnomad-api gnomad-api-pod=${IMAGE_NAME}:${DEPLOY_TAG}

# Wait for rollout to finish
kubectl rollout status deployment/gnomad-api

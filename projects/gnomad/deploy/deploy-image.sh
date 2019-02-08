#!/bin/bash

set -eu

if [ $# -lt 2 ]; then
  echo "Usage: deploy-image.sh tag p|d" 1>&2
  exit 1
fi

DEPLOY_TAG=$1
ENVIRONMENT=$2

if [[ $ENVIRONMENT != "p" ]] && [[ $ENVIRONMENT != "d" ]]; then
  echo "Environment must be either 'p' or 'd'" 1>&2
  exit 1
fi

# cd to projects/gnomad directory
DEPLOY_DIR=$(dirname "${BASH_SOURCE}")
cd "${DEPLOY_DIR}/.."

source "../../cluster/config.sh"
IMAGE_NAME="gcr.io/${GCLOUD_PROJECT}/gnomad-browser-beta"

# Push to container registry
gcloud docker -- push "${IMAGE_NAME}:${DEPLOY_TAG}"
gcloud docker -- push "${IMAGE_NAME}:latest"

DEPLOYMENT="gnomad-${ENVIRONMENT}-serve"
CONTAINER="gnomad-${ENVIRONMENT}-serve"

# Update deployment
kubectl set image "deployment/${DEPLOYMENT}" "${CONTAINER}=${IMAGE_NAME}:${DEPLOY_TAG}"

# Wait for rollout to finish
kubectl rollout status "deployment/${DEPLOYMENT}"

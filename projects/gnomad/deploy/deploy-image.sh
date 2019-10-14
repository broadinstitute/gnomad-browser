#!/bin/bash

set -eu

if [ $# -lt 1 ]; then
  echo "Usage: deploy-image.sh tag" 1>&2
  exit 1
fi

DEPLOY_TAG=$1

# cd to projects/gnomad directory
DEPLOY_DIR=$(dirname "${BASH_SOURCE}")
cd "${DEPLOY_DIR}/.."

source "../../cluster/config.sh"
IMAGE_NAME="gcr.io/${GCLOUD_PROJECT}/gnomad-browser"

# Push to container registry
gcloud docker -- push "${IMAGE_NAME}:${DEPLOY_TAG}"
gcloud docker -- push "${IMAGE_NAME}:latest"

DEPLOYMENT="gnomad-browser"

# Update deployment
kubectl set image "deployment/${DEPLOYMENT}" "app=${IMAGE_NAME}:${DEPLOY_TAG}"

# Wait for rollout to finish
kubectl rollout status "deployment/${DEPLOYMENT}"

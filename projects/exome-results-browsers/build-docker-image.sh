#!/bin/bash

set -eu

if [ $# -lt 1 ]; then
  echo "Usage: build-docker-image.sh browser" 1>&2
  exit 1
fi

BROWSER=$1

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

# Validate browser argument
if [[ ! -d ./browsers/${BROWSER} ]]; then
  echo "configuration for ${BROWSER} does not exist" 1>&2
  exit 1
fi

source "../../cluster/config.sh"
IMAGE_NAME="gcr.io/${GCLOUD_PROJECT}/${BROWSER}-browser"

./build.sh $BROWSER

# Tag image with git revision
# Add "-modified" if there are uncommitted local changes
COMMIT_HASH=$(git rev-parse --short HEAD)
GIT_STATUS=$(git status --porcelain 2> /dev/null | tail -n1)
IMAGE_TAG=${COMMIT_HASH}
if [[ -n $GIT_STATUS ]]; then
  IMAGE_TAG=${IMAGE_TAG}-modified
fi

docker build --tag ${IMAGE_NAME}:${IMAGE_TAG} --tag ${IMAGE_NAME}:latest .

echo ${IMAGE_NAME}:${IMAGE_TAG}

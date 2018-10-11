#!/bin/bash

set -eu

# cd to projects/gnomad directory
DEPLOY_DIR=$(dirname "${BASH_SOURCE}")
cd "${DEPLOY_DIR}/.."

source "../../cluster/config.sh"
IMAGE_NAME="gcr.io/${GCLOUD_PROJECT}/gnomad-browser-beta"

# Compile JS
./build.sh

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

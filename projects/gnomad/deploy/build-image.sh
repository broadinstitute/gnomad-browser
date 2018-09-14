#!/bin/bash

set -eu

# cd to projects/gnomad directory
DEPLOY_DIR=$(dirname "${BASH_SOURCE}")
cd "${DEPLOY_DIR}/.."

source "../../cluster/config.sh"
IMAGE_NAME="gcr.io/${GCLOUD_PROJECT}/gnomad-browser-beta"

# If GNOMAD_BROWSER_DIR is not set, then assume gnomad_browser is checked out side by side
# with gnomadjs and get absolute path (required by webpack)
GNOMAD_BROWSER_DIR="${GNOMAD_BROWSER_DIR:-$(cd ../../../gnomad_browser && pwd)}"

# Compile JS
yarn run build:umd --output-path="${GNOMAD_BROWSER_DIR}/static"

# Tag image with git revision
# Add "-modified" if there are uncommitted local changes
COMMIT_HASH=$(git rev-parse --short HEAD)
GIT_STATUS=$(git status --porcelain 2> /dev/null | tail -n1)
IMAGE_TAG=${COMMIT_HASH}
if [[ -n $GIT_STATUS ]]; then
  IMAGE_TAG=${IMAGE_TAG}-modified
fi

# Must have new_gene_page branch checked out in gnomad_browser
pushd $GNOMAD_BROWSER_DIR
CURRENT_GNOMAD_BROWSER_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ $CURRENT_GNOMAD_BROWSER_BRANCH != "new_gene_page" ]]; then
  echo "Error: new_gene_page branch must be checked out in gnomad_browser" 1>&2
  exit 1
fi
popd # Back to gnomadjs/projects/gnomad

docker build --file "${GNOMAD_BROWSER_DIR}/deploy/dockerfiles/gnomadserve.dockerfile" \
  --tag ${IMAGE_NAME}:${IMAGE_TAG} \
  --tag ${IMAGE_NAME}:latest \
  ${GNOMAD_BROWSER_DIR}

echo ${IMAGE_NAME}:${IMAGE_TAG}

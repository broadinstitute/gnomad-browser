#!/bin/sh -eu

# This is kind of strange, but we do this to ensure the script runs with the right
# working directory without you having to worry about where you run the script from.
SCRIPT_DIR="$(dirname "$0")"
cd "$SCRIPT_DIR/.."

# Tag image with git revision
COMMIT_HASH=$(git rev-parse --short HEAD)
IMAGE_TAG=${COMMIT_HASH}

# Add current branch name to tag if not on main branch
BRANCH=$(git symbolic-ref --short -q HEAD)
if [ "$BRANCH" != "main" ]; then
  TAG_BRANCH=$(echo "$BRANCH" | sed 's/[^A-Za-z0-9_\-\.]/_/g')
  IMAGE_TAG="${IMAGE_TAG}-${TAG_BRANCH}"
fi

# Add "-modified" to tag if there are uncommitted local changes
GIT_STATUS=$(git status --porcelain 2> /dev/null | tail -n1)
if [ -n "$GIT_STATUS" ]; then
  IMAGE_TAG="${IMAGE_TAG}-modified"
fi

docker build -f deploy/dockerfiles/reads/reads-server.dockerfile . \
  --tag "us-docker.pkg.dev/exac-gnomad/gnomad/gnomad-reads-server:${IMAGE_TAG}"

docker build -f deploy/dockerfiles/reads/reads-api.dockerfile . \
  --tag "us-docker.pkg.dev/exac-gnomad/gnomad/gnomad-reads-api:${IMAGE_TAG}"

echo "us-docker.pkg.dev/exac-gnomad/gnomad/gnomad-reads-server:${IMAGE_TAG}"
echo "us-docker.pkg.dev/exac-gnomad/gnomad/gnomad-reads-api:${IMAGE_TAG}"

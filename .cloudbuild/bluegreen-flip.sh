#!/bin/bash

set -euo pipefail

# Ensure that our cloudbuild has everything we need
for cmd in git yq; do
    if ! command -v $cmd &> /dev/null; then
        echo "Error: $cmd is not installed." >&2
        exit 1
    fi
done


mkdir -p /root/.ssh && chmod 0700 /root/.ssh
echo "$DEPLOY_KEY" > /root/.ssh/id_rsa
chmod 400 /root/.ssh/id_rsa
ssh-keyscan -t rsa github.com > /root/.ssh/known_hosts
git clone git@github.com:broadinstitute/gnomad-deployments.git

cd gnomad-deployments/gnomad-browser/prod-deflector

CURRENT_DEPLOYMENT=$(yq '.spec.selector.deployment' < gnomad-bluegreen.service.yaml)

echo "Current deployment is: $CURRENT_DEPLOYMENT"

if [[ "$CURRENT_DEPLOYMENT" != "blue" && "$CURRENT_DEPLOYMENT" != "green" ]]; then
    echo "Error: Current deployment is not either green or blue, unknown state. Exiting."
    exit 1
fi

if [[ "$CURRENT_DEPLOYMENT" == "blue" ]]; then
    TARGET_DEPLOYMENT="green"
else
    TARGET_DEPLOYMENT="blue"
fi

yq -i ".spec.selector.deployment = \"${TARGET_DEPLOYMENT}\"" gnomad-bluegreen.service.yaml

git add gnomad-bluegreen.service.yaml
git -c user.name="TGG Automation" -c user.email="tgg-automation@broadinstitute.org" commit -m "Updating gnomad-browser active service to $TARGET_DEPLOYMENT"
git show

git push origin main

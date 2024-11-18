#!/bin/bash

set -euo pipefail

# Ensure that our cloudbuild has everything we need
for cmd in git yq kubectl gcloud kustomize curl; do
    if ! command -v $cmd &> /dev/null; then
        echo "Error: $cmd is not installed." >&2
        exit 1
    fi
done

####
# Retrieve current active blue/green and verify that it matches what's currently defined in git
####

gcloud container clusters get-credentials --dns-endpoint --zone $CLOUDSDK_COMPUTE_ZONE $CLOUDSDK_CONTAINER_CLUSTER

CURRENT_DEPLOYMENT=$(kubectl get service gnomad-browser-bluegreen -o jsonpath='{.spec.selector.deployment}')

echo "current deployment: $CURRENT_DEPLOYMENT"

mkdir -p /root/.ssh && chmod 0700 /root/.ssh
echo "$DEPLOY_KEY" > /root/.ssh/id_rsa
chmod 400 /root/.ssh/id_rsa
ssh-keyscan -t rsa github.com > /root/.ssh/known_hosts
git clone git@github.com:broadinstitute/gnomad-deployments.git

cd gnomad-deployments/gnomad-browser

INTENDED_DEPLOYMENT=$(yq '.spec.selector.deployment' < prod-deflector/gnomad-bluegreen.service.yaml)

echo "intended current deployment: $INTENDED_DEPLOYMENT"

# If current and intended deployments are not either blue or green, something has gone wrong.
if [[ "$CURRENT_DEPLOYMENT" != "blue" && "$CURRENT_DEPLOYMENT" != "green" ]] || [[ "$INTENDED_DEPLOYMENT" != "blue" && "$INTENDED_DEPLOYMENT" != "green" ]]; then
    echo "Error: Deployments must be either 'blue' or 'green'."
    exit 1
fi

# Determine inactive deployment target
if [ "$CURRENT_DEPLOYMENT" == "$INTENDED_DEPLOYMENT" ]; then
    if [ "$CURRENT_DEPLOYMENT" == "blue" ]; then
        TARGET_DEPLOYMENT="green"
    else
        TARGET_DEPLOYMENT="blue"
    fi
else
    echo "The current deployment and the intended deployment don't match. Exiting"
    exit 1
fi

echo "target/inactive deployment is $TARGET_DEPLOYMENT"

####
# Update image tags in the inactive deployment and push
####
pushd $TARGET_DEPLOYMENT
kustomize --stack-trace edit set image "gnomad-api=us-docker.pkg.dev/${REPO_PROJECT}/gnomad/gnomad-api:${DOCKER_TAG}"
kustomize --stack-trace edit set image "gnomad-browser=us-docker.pkg.dev/${REPO_PROJECT}/gnomad/gnomad-browser:${DOCKER_TAG}"
popd

git add $TARGET_DEPLOYMENT
git -c user.name="TGG Automation" -c user.email="tgg-automation@broadinstitute.org" commit -m "Updating gnomad-browser $TARGET_DEPLOYMENT deployments to image tag: $DOCKER_TAG"
git show
git push origin main

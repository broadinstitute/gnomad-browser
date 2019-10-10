#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
source "${ROOT}/config.sh"

# TODO: validate arguments
NODE_POOL_NAME="$1"
shift
OTHER_ARGS="$@"

gcloud beta --project "$PROJECT" container node-pools create "$NODE_POOL_NAME" \
    --cluster "$GKE_CLUSTER_NAME" \
    --zone "$ZONE" \
    --enable-autorepair \
    --enable-autoupgrade \
    --service-account "$FULL_GKE_NODE_SA_NAME" \
    --shielded-secure-boot \
    --metadata disable-legacy-endpoints=true \
    $OTHER_ARGS

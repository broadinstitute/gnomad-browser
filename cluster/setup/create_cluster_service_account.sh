#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
source "${ROOT}/config.sh"


# Create a least privilege service account for cluster nodes
# https://cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster#use_least_privilege_service_accounts_for_your_nodes
#
# GKE requires logging.logWriter, monitoring.metricWriter, and monitoring.viewer
#
# stackdriver.resourceMetadata.writer is required for Stackdriver monitoring
# https://cloud.google.com/monitoring/kubernetes-engine/observing
#
# storage.objectViewer is required to use private images in the Container Registry
#
gcloud --project="$PROJECT" iam service-accounts create "$GKE_NODE_SA_NAME" \
    --display-name "$GKE_NODE_SA_DISPLAY_NAME"


gcloud projects add-iam-policy-binding "$PROJECT" \
    --member serviceAccount:"$FULL_GKE_NODE_SA_NAME" \
    --role roles/logging.logWriter

gcloud projects add-iam-policy-binding "$PROJECT" \
    --member serviceAccount:"$FULL_GKE_NODE_SA_NAME" \
    --role roles/monitoring.metricWriter

gcloud projects add-iam-policy-binding "$PROJECT" \
    --member serviceAccount:"$FULL_GKE_NODE_SA_NAME" \
    --role roles/stackdriver.resourceMetadata.writer

gcloud projects add-iam-policy-binding "$PROJECT" \
    --member serviceAccount:"$FULL_GKE_NODE_SA_NAME" \
    --role roles/monitoring.viewer

gcloud projects add-iam-policy-binding "$PROJECT" \
    --member serviceAccount:"$FULL_GKE_NODE_SA_NAME" \
    --role roles/storage.objectViewer

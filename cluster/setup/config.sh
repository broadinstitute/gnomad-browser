#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
set -a
source "${ROOT}/../.env"
set +a

export PROJECT=${PROJECT:-}
if [ -z "$PROJECT" ]; then
  echo "PROJECT must be set" 1>&2
  exit 1
fi

export REGION=${REGION:-"us-central1"}
export ZONE=${ZONE:-"us-central1-a"}

export ENVIRONMENT="prod"

# Network configuration
export NETWORK_NAME="gnomad-${ENVIRONMENT}"

# GKE configuration
export GKE_CLUSTER_NAME="gnomad-${ENVIRONMENT}"

DEFAULT_AUTHORIZED_NETWORKS=("0.0.0.0/0")
export AUTHORIZED_NETWORKS=${AUTHORIZED_NETWORKS[@]:-${DEFAULT_AUTHORIZED_NETWORKS[@]}}

export GKE_NODE_SA_NAME="gnomad-gke-cluster-nodes-${ENVIRONMENT}"
export GKE_NODE_SA_DISPLAY_NAME="gnomAD GKE Cluster Nodes (${ENVIRONMENT})"
export FULL_GKE_NODE_SA_NAME="${GKE_NODE_SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

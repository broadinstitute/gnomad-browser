#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
source "${ROOT}/config.sh"


# Get the most recent master version available
GKE_VERSION=$(gcloud --project="$PROJECT" container get-server-config --zone "$ZONE" --format="value(validMasterVersions[0])")

# Create a private cluster
# https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters
# https://cloud.google.com/kubernetes-engine/docs/how-to/protecting-cluster-metadata
#
# This allows access to the master only from the IP ranges specified in MASTER_AUTHORIZED_NETWORKS
# https://cloud.google.com/kubernetes-engine/docs/how-to/authorized-networks
#
# Enable Stackdriver Kubernetes monitoring
# https://cloud.google.com/monitoring/kubernetes-engine/
#
# Use shielded nodes
# https://cloud.google.com/kubernetes-engine/docs/how-to/shielded-gke-nodes
#
# Disable authentication with static password and client certificate
# https://cloud.google.com/kubernetes-engine/docs/how-to/hardening-your-cluster#restrict_authn_methods
#
# Disable legacy metadata API
#
# Set nodes to automatically repair and upgrade
# https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-repair
# https://cloud.google.com/kubernetes-engine/docs/how-to/node-auto-upgrades
#
gcloud beta --project "$PROJECT" container clusters create "$GKE_CLUSTER_NAME" \
    --zone "$ZONE" \
    --cluster-version "$GKE_VERSION" \
    --enable-autorepair \
    --enable-autoupgrade \
    --maintenance-window 7:00 \
    --service-account "$FULL_GKE_NODE_SA_NAME" \
    --network "$NETWORK_NAME" \
    --subnetwork "${NETWORK_NAME}-gke" \
    --cluster-secondary-range-name gke-pods \
    --services-secondary-range-name gke-services \
    --enable-ip-alias \
    --enable-master-authorized-networks \
    --enable-private-nodes \
    --master-authorized-networks $(IFS=,; echo "${AUTHORIZED_NETWORKS[*]}") \
    --master-ipv4-cidr 172.16.0.0/28 \
    --enable-stackdriver-kubernetes \
    --enable-shielded-nodes \
    --shielded-secure-boot \
    --metadata disable-legacy-endpoints=true \
    --no-enable-basic-auth \
    --no-enable-legacy-authorization \
    --no-issue-client-certificate \
    --num-nodes 1 \
    --machine-type n1-standard-4


gcloud --project "$PROJECT" container clusters get-credentials "$GKE_CLUSTER_NAME" --zone "$ZONE"

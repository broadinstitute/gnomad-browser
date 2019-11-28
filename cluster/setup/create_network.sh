#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
source "${ROOT}/config.sh"


# Create a VPC network
# https://cloud.google.com/vpc/docs/using-vpc
gcloud --project "$PROJECT" compute networks create "$NETWORK_NAME" \
    --subnet-mode=custom


# Create a subnet for the GKE cluster
# https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters#custom_subnet
gcloud --project "$PROJECT" compute networks subnets create "${NETWORK_NAME}-gke" \
    --network "$NETWORK_NAME" \
    --region "$REGION" \
    --range 192.168.0.0/20 \
    --secondary-range gke-pods=10.4.0.0/14,gke-services=10.0.32.0/20 \
    --enable-flow-logs \
    --enable-private-ip-google-access


# IP range for Dataproc machines
# The loadBalancerSourceRanges configuration for the internal load balancer must include this IP range
DATAPROC_IP_RANGE=192.168.255.0/24


# Create a subnet for Dataproc machines
gcloud --project "$PROJECT" compute networks subnets create "${NETWORK_NAME}-dataproc" \
  --network "$NETWORK_NAME" \
  --region "$REGION" \
  --range "$DATAPROC_IP_RANGE" \
  --enable-flow-logs \
  --enable-private-ip-google-access

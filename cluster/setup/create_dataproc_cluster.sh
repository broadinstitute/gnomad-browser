#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
source "${ROOT}/config.sh"

# TODO: validate arguments
CLUSTER_NAME="$1"
shift
OTHER_ARGS="$@"

# TODO: Internal IP addresses only
# https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/network#create_a_cloud_dataproc_cluster_with_internal_ip_address_only

# Use zone and region settings from config.sh
# Create cluster in network
# Set tags required for dataproc-internal firewall rule
hailctl dataproc start "$CLUSTER_NAME" \
  --project "$PROJECT" \
  --region "$REGION" \
  --zone "$ZONE" \
  --subnet "${NETWORK_NAME}-dataproc" \
  --tags dataproc-node \
  --max-idle 1h \
  --packages "elasticsearch~=5.5" \
  $OTHER_ARGS

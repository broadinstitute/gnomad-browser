#!/bin/bash -eu

ROOT=$(dirname "${BASH_SOURCE[0]}")
source "${ROOT}/config.sh"


# Allow access from the GKE master to ports 9200 and 9300 on nodes
# This allows access to Elasticsearch through kubectl proxy

# Find the tag that GKE applies to all nodes in the cluster
# This has be done after the GKE cluster is created
# https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters#add_firewall_rules
GKE_NODES_TARGET_TAG=$(
  gcloud --project "$PROJECT" compute firewall-rules list \
    --filter "name~^gke-${GKE_CLUSTER_NAME}" \
    --format "value(targetTags.list())" | head -n1
)

gcloud --project "$PROJECT" compute firewall-rules create "${NETWORK_NAME}-elasticsearch" \
  --action ALLOW \
  --direction INGRESS \
  --network "$NETWORK_NAME" \
  --rules tcp:9200,tcp:9300 \
  --source-ranges 172.16.0.0/28 \
  --target-tags $GKE_NODES_TARGET_TAG


# Allow Dataproc machines to talk to each other
# https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/network
#
# Dataproc clusters must be created with --tags=dataproc-node for this to apply
gcloud --project "$PROJECT" compute firewall-rules create "${NETWORK_NAME}-dataproc-internal" \
  --action ALLOW \
  --direction INGRESS \
  --network "$NETWORK_NAME" \
  --rules=tcp:0-65535,udp:0-65535,icmp \
  --source-tags "dataproc-node" \
  --target-tags "dataproc-node"


# Allow SSH access to Dataproc machines from authorized networks
#
# Dataproc clusters must be created with --tags=dataproc-node for this to apply
gcloud --project "$PROJECT" compute firewall-rules create "${NETWORK_NAME}-dataproc-ssh" \
  --action ALLOW \
  --direction INGRESS \
  --network "$NETWORK_NAME" \
  --rules=tcp:22 \
  --source-ranges $(IFS=,; echo "${AUTHORIZED_NETWORKS[*]}") \
  --target-tags "dataproc-node"

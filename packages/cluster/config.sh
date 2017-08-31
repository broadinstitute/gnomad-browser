#!/bin/bash

export GCLOUD_PROJECT=exac-gnomad
export GCLOUD_ZONE=us-central1-b
export CLUSTER_NAME=test-cluster
export CLUSTER_NAMESPACE=default

export DATAPROC_CLUSTER_NAME=no-vep
export DATAPROC_CLUSTER_MACHINE_TYPE=n1-standard-4
export DATAPROC_CLUSTER_NUM_NODES=2

export ES_HOST_IP=10.8.0.13
export ES_IP=23.236.50.46
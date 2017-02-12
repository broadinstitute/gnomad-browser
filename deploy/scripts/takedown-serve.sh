#!/bin/bash

# halt on any error
set -e

# Set project
gcloud config set project exac-gnomad

# Bring down previous replication controller
kubectl delete service gnomad-graphql-rc
kubectl delete hpa gnomad-graphql-rc
kubectl delete rc gnomad-graphql-rc

# Delete the cluster
# gcloud container clusters delete gnomad-serving-cluster --zone us-east1-d

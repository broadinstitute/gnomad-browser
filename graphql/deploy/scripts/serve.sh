#!/bin/bash

# halt on any error
set -e

# Set project and kubernetes cluster
gcloud config set project exac-gnomad
kubectl config use-context gke_exac-gnomad_us-east1-d_gnomad-serving-cluster

# Start the server and expose to the internet w/ autoscaling & load balancing
kubectl create -f deploy/config/gnomad-graphql-rc.json
kubectl expose rc gnomad-graphql-rc --type="LoadBalancer"
# --load-balancer-ip=35.185.33.81
kubectl autoscale rc gnomad-graphql-rc --min=5 --max=20 --cpu-percent=80

#!/bin/bash

# halt on any error
set -e

# Set project
gcloud config set project exac-gnomad

# Push docker images
gcloud docker push gcr.io/exac-gnomad/gnomadgraphqlbase
gcloud docker push gcr.io/exac-gnomad/gnomadgraphql

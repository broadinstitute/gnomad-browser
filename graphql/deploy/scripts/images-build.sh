#!/bin/bash

# halt on any error
set -e

# Build docker images
docker build -f deploy/dockerfiles/gnomadgraphqlbase.dockerfile -t gcr.io/exac-gnomad/gnomadgraphqlbase .
docker build -f deploy/dockerfiles/gnomadgraphql.dockerfile -t gcr.io/exac-gnomad/gnomadgraphql .

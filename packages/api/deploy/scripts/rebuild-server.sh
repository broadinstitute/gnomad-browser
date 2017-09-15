#!/bin/bash

"$(dirname "$0")"/takedown-serve.sh
"$(dirname "$0")"/images-build.sh
# docker build -f deploy/dockerfiles/gnomadserve.dockerfile -t gcr.io/exac-gnomad/gnomadserve .
"$(dirname "$0")"/images-push.sh
# gcloud docker push gcr.io/exac-gnomad/gnomadserve
# sleep 100
"$(dirname "$0")"/serve.sh

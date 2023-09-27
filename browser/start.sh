#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

export NODE_ENV="development"
export GNOMAD_API_URL=${GNOMAD_API_URL:-"https://gnomad.broadinstitute.org/api"}
export READS_API_URL=${READS_API_URL:-"https://gnomad.broadinstitute.org/reads"}

pnpm ts-node ./build/buildHelp.ts

pnpm webpack serve

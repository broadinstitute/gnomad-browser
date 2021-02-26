#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

export NODE_ENV="development"
export GNOMAD_API_URL=${GNOMAD_API_URL:-"https://gnomad.broadinstitute.org/api"}
export READS_API_URL=${READS_API_URL:-"https://gnomad.broadinstitute.org/reads"}

./build/buildFAQ.js
./build/buildHelp.js

yarn run webpack serve

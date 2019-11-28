#!/bin/bash

set -eu

PROJECT_DIR=$(dirname "${BASH_SOURCE}")
cd $PROJECT_DIR

export NODE_ENV="production"

rm -rf dist

yarn run webpack

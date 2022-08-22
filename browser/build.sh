#!/bin/sh

set -eu

PROJECT_DIR=$(dirname "$0")
cd $PROJECT_DIR

yarn run ts-node ./build/buildHelp.ts

yarn run webpack

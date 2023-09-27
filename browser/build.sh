#!/bin/sh

set -eu

PROJECT_DIR=$(dirname "$0")
cd $PROJECT_DIR

pnpm ts-node ./build/buildHelp.ts

pnpm webpack

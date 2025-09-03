#!/bin/bash

export MENDELIAN_TSV_PATH=/Users/msolomon/code/random/mono2/gmd-api/data/gene-disease-table_8_13_2025.tsv

export NODE_ENV=${NODE_ENV:-development}

if [[ $NODE_ENV == "development" ]]; then
  npx ts-node src/server.ts
else
  node dist/server.js
fi

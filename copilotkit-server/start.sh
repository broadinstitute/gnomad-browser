#!/bin/bash

# This script runs the CopilotKit server standalone for local development/testing
# Note: The CopilotKit server code has been moved to graphql-api/src/copilotkit/

export GMD_COMMAND_PATH=${HOME}/.grove/bin/gmd
export MENDELIAN_TSV_PATH=/Users/msolomon/code/browser-ecosystem/gmd-api/data/gene-disease-table_8_13_2025.tsv
export GNOMAD_API_URL=${GNOMAD_API_URL:-http://localhost:8010/api}

export NODE_ENV=${NODE_ENV:-development}

if [[ $NODE_ENV == "development" ]]; then
  npx ts-node ../graphql-api/src/copilotkit/server.ts
else
  echo "ERROR: Production mode not supported for standalone copilotkit-server"
  echo "The CopilotKit server is now integrated into the GraphQL API."
  echo "For production, deploy the graphql-api which includes CopilotKit."
  exit 1
fi

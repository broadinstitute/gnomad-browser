#!/bin/bash
set -euo pipefail

# Prepares and verifies CopilotKit artifacts before Docker build
# Run this when you've updated gmd binary or Mendelian TSV file
# Then: docker-compose -f development/api.docker-compose.yaml up --build

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Load environment from .env if present
if [ -f "${REPO_ROOT}/.env" ]; then
    set -a
    source "${REPO_ROOT}/.env"
    set +a
fi

# Prepare CopilotKit artifacts (gmd binary, Mendelian TSV)
if [ -f "${REPO_ROOT}/deploy/scripts/prepare-copilotkit-artifacts.sh" ]; then
    "${REPO_ROOT}/deploy/scripts/prepare-copilotkit-artifacts.sh"
fi

# Verify required artifacts
MISSING=()
[ ! -f "${REPO_ROOT}/bin/gmd" ] && MISSING+=("bin/gmd")
[ ! -f "${REPO_ROOT}/resources/gene-disease-table.tsv" ] && MISSING+=("resources/gene-disease-table.tsv")
[ ! -f "${SCRIPT_DIR}/schema.sql" ] && MISSING+=("schema.sql")

if [ ${#MISSING[@]} -ne 0 ]; then
    echo "ERROR: Missing artifacts: ${MISSING[@]}"
    echo "Set GMD_BINARY_PATH and MENDELIAN_TSV_PATH in .env and run prepare-copilotkit-artifacts.sh"
    exit 1
fi

echo "✓ CopilotKit artifacts ready"
echo "Run: docker-compose -f development/api.docker-compose.yaml up --build"

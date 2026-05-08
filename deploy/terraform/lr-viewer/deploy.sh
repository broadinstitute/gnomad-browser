#!/bin/bash
#
# deploy.sh - One-command deployment for gnomAD LR haplotype viewer
#
# Usage: ./deploy.sh [--api-only] [--browser-only] [--skip-build] [--tf-only]
#
# This script:
# 1. Builds and pushes Docker images (API + browser) to Artifact Registry
# 2. Deploys infrastructure via Terraform (ClickHouse VM + Cloud Run)
#
# Options:
#   --api-only      Only build/push the API image
#   --browser-only  Only build/push the browser image
#   --skip-build    Skip Docker builds, just run Terraform
#   --tf-only       Same as --skip-build
#

set -euo pipefail

# Colima users need DOCKER_HOST set for the kreuzwerker/docker provider
if [ -S "$HOME/.colima/default/docker.sock" ]; then
  export DOCKER_HOST="unix://$HOME/.colima/default/docker.sock"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

PROJECT_ID="gnomadev"
REGION="us-east1"
REGISTRY="us-docker.pkg.dev/${PROJECT_ID}/gnomad"
GIT_SHA=$(cd "$REPO_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(cd "$REPO_ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

API_IMAGE="${REGISTRY}/gnomad-lr-api"
BROWSER_IMAGE="${REGISTRY}/gnomad-lr-browser"

# Parse arguments
BUILD_API=true
BUILD_BROWSER=true
SKIP_BUILD=false

for arg in "$@"; do
    case $arg in
        --api-only)
            BUILD_BROWSER=false
            ;;
        --browser-only)
            BUILD_API=false
            ;;
        --skip-build|--tf-only)
            SKIP_BUILD=true
            ;;
    esac
done

echo "==================================="
echo "Deploying gnomAD LR Haplotype Viewer"
echo "Branch: ${GIT_BRANCH}"
echo "Commit: ${GIT_SHA}"
echo "Registry: ${REGISTRY}"
echo "==================================="

# Check prerequisites
for cmd in terraform gcloud; do
    if ! command -v $cmd &> /dev/null; then
        echo "Error: $cmd is not installed"
        exit 1
    fi
done

if [ "$SKIP_BUILD" = false ]; then
    cd "$REPO_ROOT"

    CLOUDBUILD_CONFIG="deploy/terraform/lr-viewer/cloudbuild.yaml"

    if [ "$BUILD_API" = true ]; then
        echo ""
        echo ">>> Building API image with Cloud Build..."
        gcloud builds submit \
            --project="${PROJECT_ID}" \
            --config="${CLOUDBUILD_CONFIG}" \
            --substitutions="_DOCKERFILE=deploy/dockerfiles/browser/api.dockerfile,_IMAGE=${API_IMAGE}" \
            --timeout=15m \
            .
        echo ">>> API image pushed: ${API_IMAGE}:latest"
    fi

    if [ "$BUILD_BROWSER" = true ]; then
        echo ""
        echo ">>> Building browser image with Cloud Build..."
        gcloud builds submit \
            --project="${PROJECT_ID}" \
            --config="${CLOUDBUILD_CONFIG}" \
            --substitutions="_DOCKERFILE=deploy/dockerfiles/browser/browser.dockerfile,_IMAGE=${BROWSER_IMAGE}" \
            --timeout=15m \
            .
        echo ">>> Browser image pushed: ${BROWSER_IMAGE}:latest"
    fi
fi

# Deploy with Terraform
echo ""
echo ">>> Deploying infrastructure with Terraform..."
cd "$SCRIPT_DIR"

if [ ! -d ".terraform" ]; then
    echo ">>> Initializing Terraform..."
    terraform init
fi

echo ">>> Running Terraform plan..."
terraform plan -out=plan.tfplan

echo ""
read -p ">>> Apply this plan? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    terraform apply plan.tfplan
else
    echo ">>> Skipped apply."
fi

rm -f plan.tfplan

# Show outputs
echo ""
echo "==================================="
echo "Deployment complete!"
echo "==================================="
echo "Git: ${GIT_BRANCH} @ ${GIT_SHA}"
echo ""
terraform output
echo ""
echo "Next steps:"
echo "  1. SSH into the CH VM:  gcloud compute ssh gnomad-lr-data-vm --project=gnomadev --zone=us-east1-c --tunnel-through-iap"
echo "  2. Load data:           cd /opt/gnomad-browser && python3 development/load_real_haplotype_data.py --backend clickhouse ..."

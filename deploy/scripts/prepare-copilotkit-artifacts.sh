#!/bin/bash

# Prepare CopilotKit artifacts for Docker build
# This script copies the required gmd binary and Mendelian TSV file
# into the repository structure for inclusion in the API Docker image
#
# Configuration is read from a .env file in the repository root.
# See .env.example for required variables.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Load environment variables from .env file
if [ ! -f ".env" ] && [ ! -f ".env.fish" ]; then
    echo "ERROR: .env or .env.fish file not found"
    echo
    echo "Please create an environment file in the repository root with the required configuration."
    echo "You can copy .env.example as a starting point:"
    echo
    echo "  For bash/zsh: cp .env.example .env"
    echo "  For fish shell: cp .env.example .env.fish (and convert to fish syntax)"
    echo
    echo "Then edit your env file and set the following variables:"
    echo "  - GMD_BINARY_PATH: Path to the gmd binary on your build machine"
    echo "  - MENDELIAN_TSV_PATH: Path to the Mendelian disease TSV file"
    echo
    exit 1
fi

if [ -f ".env" ]; then
    echo "Loading configuration from .env..."
    # Export variables from .env, ignoring comments and empty lines
    set -a
    source .env
    set +a
    echo
else
    echo "NOTE: Using .env.fish - ensure variables are exported before running this script"
    echo "      Run: source .env.fish"
    echo
fi

# Validate required variables
MISSING_VARS=()

if [ -z "$GMD_BINARY_PATH" ]; then
    MISSING_VARS+=("GMD_BINARY_PATH")
fi

if [ -z "$MENDELIAN_TSV_PATH" ]; then
    MISSING_VARS+=("MENDELIAN_TSV_PATH")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "ERROR: Required environment variables are not set in .env:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo
    echo "Please edit your .env file and set these variables."
    echo "See .env.example for reference."
    exit 1
fi

echo "Preparing CopilotKit build artifacts..."
echo

# Create directories
echo "Creating bin/ and resources/ directories..."
mkdir -p bin resources

# Build gmd binary for Linux AMD64
echo "Building gmd binary for Linux AMD64..."
GMD_SOURCE_DIR="$(dirname "$GMD_BINARY_PATH")/.."
if [ ! -d "$GMD_SOURCE_DIR" ]; then
    echo "ERROR: Cannot find gmd source directory at: $GMD_SOURCE_DIR"
    echo
    echo "Please check the GMD_BINARY_PATH in your .env file."
    exit 1
fi

(cd "$GMD_SOURCE_DIR" && GOOS=linux GOARCH=amd64 go build -o "$REPO_ROOT/bin/gmd" .)
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build gmd binary"
    exit 1
fi

chmod +x bin/gmd
echo "✓ gmd binary built for linux/amd64 at bin/gmd"
echo

# Copy Mendelian TSV file
if [ ! -f "$MENDELIAN_TSV_PATH" ]; then
    echo "ERROR: Mendelian TSV file not found at: $MENDELIAN_TSV_PATH"
    echo
    echo "Please check the MENDELIAN_TSV_PATH in your .env file."
    exit 1
fi

echo "Copying Mendelian TSV from $MENDELIAN_TSV_PATH..."
cp "$MENDELIAN_TSV_PATH" resources/gene-disease-table.tsv
echo "✓ Mendelian TSV copied to resources/gene-disease-table.tsv"
echo

# Verify artifacts
echo "Verification:"
echo "  gmd binary:      $(ls -lh bin/gmd | awk '{print $5}')"
echo "  Mendelian TSV:   $(ls -lh resources/gene-disease-table.tsv | awk '{print $5}')"
echo

echo "✓ CopilotKit artifacts are ready for Docker build"
echo
echo "You can now build the API Docker image with:"
echo "  ./deployctl images build --push"

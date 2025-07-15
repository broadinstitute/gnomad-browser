#!/bin/bash
set -e

echo "Starting integration tests..."

# Ensure Elasticsearch is running
if ! curl -s http://localhost:9200 > /dev/null; then
    echo "Error: Elasticsearch is not running at http://localhost:9200"
    exit 1
fi

# Run Go tests
cd gnomad-go-api
go test -v ./internal/test/integration/... -run TestVariantQueriesAgainstSnapshots

echo "Integration tests completed!"
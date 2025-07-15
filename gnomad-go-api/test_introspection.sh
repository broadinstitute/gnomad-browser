#!/bin/bash

echo "Testing GraphQL introspection..."

# Test introspection query
curl -X POST http://localhost:8010/api \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { queryType { name } } }"
  }' | jq .

echo -e "\nTesting playground access..."
curl -I http://localhost:8010/
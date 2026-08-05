#!/usr/bin/env bash
# Reproduce the production API TypeScript emit in a disposable /app-style layout
# and prove raw Node can load every caller of longReadVariantId.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TSC="$REPO_ROOT/node_modules/.bin/tsc"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
APP="$TMP_DIR/app"

[[ -x "$TSC" ]] || { echo "installed TypeScript compiler is required: $TSC" >&2; exit 1; }
[[ -d "$REPO_ROOT/graphql-api/node_modules" ]] || {
  echo "installed GraphQL API dependencies are required" >&2
  exit 1
}

mkdir -p "$APP/graphql-api"
cp -R "$REPO_ROOT/dataset-metadata" "$APP/dataset-metadata"
cp -R "$REPO_ROOT/graphql-api/src" "$APP/graphql-api/src"
cp -R "$REPO_ROOT/graphql-api/static_data" "$APP/static_data"
cp "$REPO_ROOT/tsconfig.json" "$APP/graphql-api/tsconfig.json"
cp "$REPO_ROOT/tsconfig.build.json" "$APP/graphql-api/tsconfig.build.json"
ln -s "$REPO_ROOT/graphql-api/node_modules" "$APP/graphql-api/node_modules"

# This is the same no-outDir production emit used by api.dockerfile.
"$TSC" -p "$APP/graphql-api/tsconfig.build.json"

[[ -f "$APP/dataset-metadata/longReadVariantId.js" ]] || {
  echo "production emit omitted dataset-metadata/longReadVariantId.js" >&2
  exit 1
}

modules=(
  graphql-api/src/graphql/resolvers/variants.js
  graphql-api/src/graphql/resolvers/long_read_variants.js
  graphql-api/src/queries/long_read_variants.js
)
for module in "${modules[@]}"; do
  [[ -f "$APP/$module" ]] || { echo "production emit omitted $module" >&2; exit 1; }
done

if grep -n "@gnomad/dataset-metadata/longReadVariantId" \
  "$APP/graphql-api/src/graphql/resolvers/variants.js" \
  "$APP/graphql-api/src/graphql/resolvers/long_read_variants.js" \
  "$APP/graphql-api/src/queries/long_read_variants.js"; then
  echo "compiled API retained the source-only workspace runtime import" >&2
  exit 1
fi

(
  cd "$APP"
  ELASTICSEARCH_URL=http://packaging-smoke.invalid NODE_ENV=production \
    node - "${modules[@]}" <<'NODE'
for (const modulePath of process.argv.slice(2)) {
  require(`./${modulePath}`)
}
console.log(`raw Node loaded ${process.argv.length - 2} affected compiled modules`)
process.exit(0)
NODE
)

# gnomAD Go API

Go implementation of the gnomAD browser API.

## Testing

### Unit Tests

Run unit tests (excludes integration tests):
```bash
make test
# or
make test-unit
```

### Integration Tests

Integration tests require a running Elasticsearch instance with gnomAD data.

Run all integration tests:
```bash
# Using default Elasticsearch URL (http://localhost:9200)
make test-integration

# Using custom Elasticsearch URL
ELASTICSEARCH_URL=http://your-es-host:9200 make test-integration

# With authentication (default username is "elastic")
ELASTICSEARCH_PASSWORD=your-password make test-integration

# With custom username and password
ELASTICSEARCH_URL=http://localhost:9200 \
ELASTICSEARCH_USERNAME=your-username \
ELASTICSEARCH_PASSWORD=your-password \
make test-integration
```

Run specific gnomAD v4 integration tests:
```bash
make test-integration-gnomad-v4

# With authentication
ELASTICSEARCH_PASSWORD=your-password make test-integration-gnomad-v4
```

Run snapshot-based integration tests:
```bash
make test-integration-snapshots
```

Run all tests including integration tests:
```bash
make test-all
```

### Test Variant IDs

When running integration tests, you'll need to update the test variant IDs in `gnomad_v4_variants_integration_test.go` with actual variants from your Elasticsearch instance. Look for comments like `// Replace with real variant` and update with known variant IDs.

Example test variants to use:
- Variant ID: Replace `1-55516888-G-GA` with an actual variant ID
- rsID: Replace `rs1234567` with an actual rsID  
- VRS ID: Replace `ga4gh:VA.example` with an actual VRS ID

### Running Tests in CI

Integration tests are tagged with `// +build integration` and will be skipped by default in CI unless explicitly enabled.

## Development

### Building

```bash
make build
```

### Running

```bash
make run
```

### Code Generation

GraphQL schema changes require regenerating code:
```bash
make generate
```

### Linting

```bash
# Run linter
make lint

# Auto-fix linting issues
make lint-fix
```

### Installing Tools

```bash
make install-tools
```

## Troubleshooting & Debugging

### Migration Testing

This Go API is a port of the TypeScript GraphQL API. The behavior should match the original TypeScript implementation exactly.

#### Snapshot Testing

Run snapshot tests to compare Go API responses with the original TypeScript API:

```bash
# Set Elasticsearch credentials
export ELASTICSEARCH_USERNAME=elastic
export ELASTICSEARCH_PASSWORD=[REDACTED]

# Run specific test
./test-snapshots.sh [test-name]

# View test results in test_logs/ directory
ls test_logs/
```

#### Test Failure Categories

1. **GraphQL Errors/Panics**: Server errors, often from non-nullable field resolvers returning `nil`
2. **Missing Data**: Successful response but expected fields are missing
3. **Incorrect Data**: Field values or structures don't match expected snapshots

#### Debugging Workflow

1. **Analyze Failure**: Check `test_logs/[test-name].json` for error details
2. **Trace Query Path**: Follow GraphQL query to specific resolver in `internal/graph/schema.resolvers.go`
3. **Compare with TypeScript**: Reference original implementation in `graphql-api/` directory
4. **Fix Implementation**: Update Go code to match TypeScript behavior

#### Useful Resources

- **Elasticsearch Schema**: `/Users/msolomon/code/gnomad/gnomad-temp/gnomad-es-schema-2025-07-15.json`
- **Example Queries**: `/graphql-api/migration_tests/queries`
- **Expected Responses**: `/graphql-api/migration_tests/snapshots`
- **Source of Truth**: TypeScript implementation in `graphql-api/` directory

#### Priority Order for Fixes

1. **Phase 1**: Fix panics and schema violations (non-nullable fields returning `nil`)
2. **Phase 2**: Implement missing data (empty `// TODO` resolvers)  
3. **Phase 3**: Correct data mismatches (wrong values, types, or structures)

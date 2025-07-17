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

#### Elasticsearch Configuration

Set environment variables for Elasticsearch connection:
```bash
# Default: http://localhost:9200 with username "elastic"
export ELASTICSEARCH_URL=http://your-es-host:9200
export ELASTICSEARCH_USERNAME=your-username  # defaults to "elastic"
export ELASTICSEARCH_PASSWORD=your-password
```

#### Running Tests

```bash
# All integration tests
make test-integration

# Specific gnomAD v4 tests
make test-integration-gnomad-v4

# Snapshot-based tests
make test-integration-snapshots

# All tests (unit + integration)
make test-all
```

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

#### Migration Test Framework

The migration uses a comprehensive test framework located in `/graphql-api/migration_tests/`:

**Reference Data Generation (TypeScript API)**
```bash
cd /path/to/gnomad-browser/graphql-api/migration_tests
npm run generate-variables  # Create variable files from test-identifiers.json
npm run generate-snapshots  # Query TypeScript API, save reference responses
```

**Go API Validation**

The `test-snapshots.sh` script provides a convenient interface for running snapshot tests:

```bash
# Run all snapshot tests
./test-snapshots.sh

# Run specific test by name
./test-snapshots.sh variant-page-v4

# Run tests matching pattern with verbose output
./test-snapshots.sh -v copy-number

# Show log file location after test
./test-snapshots.sh -l variant-page-v4

# Get help with available options
./test-snapshots.sh --help
```

**Available test categories:**
- `variant-page-*` (Variant page tests)
- `gene-page-*` (Gene page tests) 
- `copy-number-variant-*` (Copy number variant tests)
- `structural-variant-*` (Structural variant tests)
- `short-tandem-repeat-*` (STR tests)
- `region-*` (Region tests)
- `transcript-*` (Transcript tests)

**View test results:**
```bash
ls test_logs/  # Failure logs with detailed comparisons
```

**Test Structure:**
- **50+ test queries** covering all GraphQL endpoints
- **Central test data** in `test-identifiers.json` (variants, genes, regions)
- **Reference snapshots** from TypeScript API responses
- **Behavioral validation** ensuring Go API matches TypeScript exactly

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

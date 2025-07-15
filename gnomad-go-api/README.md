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
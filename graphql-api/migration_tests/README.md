# Migration Tests

This directory contains GraphQL query tests and snapshots for the gnomAD API migration project.

## Structure

- `queries/` - GraphQL query files and their variables
- `snapshots/` - Generated JSON snapshots of query responses
- `test-identifiers.json` - Central configuration for test identifiers (variants, genes, regions, etc.)
- `generate_variables.ts` - Script to generate variable JSON files from test-identifiers.json
- `generate_snapshots.ts` - Script to execute queries and save snapshots

## Central Test Data Management

All test identifiers (variant IDs, gene IDs, regions, etc.) and datasets are defined in `test-identifiers.json`. This ensures consistency across tests and makes it easy to update test data.

### Adding New Test Variants

1. Edit `test-identifiers.json` to add new test identifiers or modify existing ones
2. Update `generate_variables.ts` to use the new variants
3. Run `npm run generate-variables` to regenerate all variable files

## Usage

### Generate Variable Files
```bash
npm run generate-variables
```
This generates all `*.json` variable files in the `queries/` directory from `test-identifiers.json`.

### Generate Snapshots
```bash
npm run generate-snapshots
```
This executes all queries against the running API and saves snapshots.

### Update Everything
```bash
npm run update-tests
```
This runs both generate-variables and generate-snapshots in sequence.

## Prerequisites

- TypeScript API running at `http://localhost:8010/api`
- Elasticsearch populated with gnomAD data

## Query Coverage

See `QUERY_COVERAGE.md` for detailed information about test coverage.
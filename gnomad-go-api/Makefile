.PHONY: generate build run test test-unit test-integration test-all lint lint-fix install-tools

# Default Elasticsearch URL for integration tests
ELASTICSEARCH_URL ?= http://localhost:9200

generate:
	@echo "Running GraphQL code generation..."
	@go run -mod=mod github.com/99designs/gqlgen@v0.17.76 generate 2>&1 | grep -v "exit status" || true
	@echo "GraphQL code generation completed"

build: generate
	go build -o bin/server cmd/server/main.go

run: generate
	go run cmd/server/main.go

# Run all tests except integration tests
test: test-unit

# Run only unit tests (excludes integration tests)
test-unit:
	go test -short ./...

# Run only integration tests (requires Elasticsearch)
test-integration:
	@echo "Running integration tests against Elasticsearch at ${ELASTICSEARCH_URL}"
	@echo "Using username: ${ELASTICSEARCH_USERNAME:-elastic}"
	@if [ -n "${ELASTICSEARCH_PASSWORD}" ]; then echo "Using password: [REDACTED]"; fi
	@ELASTICSEARCH_URL=${ELASTICSEARCH_URL} ELASTICSEARCH_USERNAME=${ELASTICSEARCH_USERNAME} ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD} go test -tags=integration -run Integration ./internal/data/queries

# Run specific gnomAD v4 integration tests
test-integration-gnomad-v4:
	@echo "Running gnomAD v4 integration tests against Elasticsearch at ${ELASTICSEARCH_URL}"
	@echo "Using username: ${ELASTICSEARCH_USERNAME:-elastic}"
	@if [ -n "${ELASTICSEARCH_PASSWORD}" ]; then echo "Using password: [REDACTED]"; fi
	@ELASTICSEARCH_URL=${ELASTICSEARCH_URL} ELASTICSEARCH_USERNAME=${ELASTICSEARCH_USERNAME} ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD} go test -tags=integration -run "TestGnomadV4.*Integration" ./internal/data/queries -v

# Run snapshot-based integration tests
test-integration-snapshots:
	go test -v ./internal/test/integration/... -run TestVariantQueriesAgainstSnapshots

# Run all tests including integration tests
test-all: test test-integration test-integration-snapshots

lint:
	golangci-lint run

lint-fix:
	golangci-lint run --fix

install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/99designs/gqlgen@v0.17.76
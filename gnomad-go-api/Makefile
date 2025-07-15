.PHONY: generate build run test lint lint-fix install-tools

generate:
	@echo "Running GraphQL code generation..."
	@go run -mod=mod github.com/99designs/gqlgen@v0.17.76 generate 2>&1 | grep -v "exit status" || true
	@echo "GraphQL code generation completed"

build: generate
	go build -o bin/server cmd/server/main.go

run: generate
	go run cmd/server/main.go

test:
	go test ./...

lint:
	golangci-lint run

lint-fix:
	golangci-lint run --fix

install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/99designs/gqlgen@v0.17.76
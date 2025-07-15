.PHONY: generate build run test

generate:
	go run github.com/99designs/gqlgen generate

build: generate
	go build -o bin/server cmd/server/main.go

run: generate
	go run cmd/server/main.go

test:
	go test ./...
package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"gnomad-browser/gnomad-go-api/internal/config"
	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph"
)

type TestServer struct {
	Server *httptest.Server
	Client *http.Client
}

// SetupTestServer creates a test server instance
func SetupTestServer(t *testing.T) *TestServer {
	// Load config
	cfg, err := config.Load()
	require.NoError(t, err)

	// Create Elasticsearch client
	esClient, err := elastic.NewClient([]string{cfg.ElasticsearchURL})
	require.NoError(t, err)

	// Create Gin router
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Add middleware
	r.Use(elastic.Middleware(esClient))

	// Setup GraphQL handler
	srv := handler.NewDefaultServer(
		graph.NewExecutableSchema(graph.Config{
			Resolvers: &graph.Resolver{},
		}),
	)

	r.POST("/api", gin.WrapH(srv))

	// Create test server
	ts := httptest.NewServer(r)

	return &TestServer{
		Server: ts,
		Client: &http.Client{},
	}
}

// ExecuteGraphQLQuery executes a GraphQL query against the test server
func (ts *TestServer) ExecuteGraphQLQuery(query string, variables map[string]interface{}) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"query":     query,
		"variables": variables,
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	resp, err := ts.Client.Post(
		ts.Server.URL+"/api",
		"application/json",
		bytes.NewReader(jsonBody),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	return result, nil
}
// Package main provides the entry point for the gnomAD GraphQL API server.
// It initializes the server configuration, sets up the GraphQL handler,
// and starts the HTTP server on the configured port.
package main

import (
	"log"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-gonic/gin"

	"gnomad-browser/gnomad-go-api/internal/config"
	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	// Initialize Elasticsearch client
	esClient, err := elastic.NewClient([]string{cfg.ElasticsearchURL})
	if err != nil {
		log.Fatal(err)
	}

	r := gin.Default()

	// Add CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Add Elasticsearch middleware
	r.Use(elastic.Middleware(esClient))

	srv := handler.New(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))

	// Add transports
	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.MultipartForm{})

	// Enable introspection
	srv.Use(extension.Introspection{})

	r.POST("/api", gin.WrapH(srv))
	r.GET("/api", gin.WrapH(srv))
	r.OPTIONS("/api", func(c *gin.Context) {
		c.Status(204)
	})

	if cfg.EnablePlayground {
		r.GET("/", gin.WrapH(playground.Handler("GraphQL playground", "/api")))
	}

	log.Printf("Server starting on port %s", cfg.Port)

	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

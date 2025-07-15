package main

import (
    "log"
    
    "github.com/99designs/gqlgen/graphql/handler"
    "github.com/99designs/gqlgen/graphql/playground"
    "github.com/gin-gonic/gin"
    
    "gnomad-browser/gnomad-go-api/internal/config"
    "gnomad-browser/gnomad-go-api/internal/graph"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatal(err)
    }
    
    r := gin.Default()
    
    srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))
    
    r.POST("/api", gin.WrapH(srv))
    
    if cfg.EnablePlayground {
        r.GET("/", gin.WrapH(playground.Handler("GraphQL playground", "/api")))
    }
    
    log.Printf("Server starting on port %s", cfg.Port)
    r.Run(":" + cfg.Port)
}
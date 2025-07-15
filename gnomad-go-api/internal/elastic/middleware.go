package elastic

import (
	"context"

	"github.com/gin-gonic/gin"
)

type contextKey string

const elasticClientKey contextKey = "elasticClient"

func Middleware(client *Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.WithValue(c.Request.Context(), elasticClientKey, client)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

func FromContext(ctx context.Context) *Client {
	client, ok := ctx.Value(elasticClientKey).(*Client)
	if !ok {
		return nil
	}

	return client
}

package elastic

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
)

type Client struct {
	es *elasticsearch.Client
}

type SearchResponse struct {
	Took     int  `json:"took"`
	TimedOut bool `json:"timed_out"`
	Shards   struct {
		Total      int `json:"total"`
		Successful int `json:"successful"`
		Skipped    int `json:"skipped"`
		Failed     int `json:"failed"`
	} `json:"_shards"`
	Hits struct {
		Total struct {
			Value    int    `json:"value"`
			Relation string `json:"relation"`
		} `json:"total"`
		MaxScore float64 `json:"max_score"`
		Hits     []Hit   `json:"hits"`
	} `json:"hits"`
}

type Hit struct {
	Index  string         `json:"_index"`
	ID     string         `json:"_id"`
	Score  float64        `json:"_score"`
	Source map[string]any `json:"_source"`
}

func NewClient(addresses []string) (*Client, error) {
	return NewClientWithAuth(addresses, "", "")
}

// NewClientWithAuth creates a new Elasticsearch client with optional authentication
func NewClientWithAuth(addresses []string, username, password string) (*Client, error) {
	cfg := elasticsearch.Config{
		Addresses: addresses,
		Transport: &http.Transport{
			MaxIdleConnsPerHost:   10,
			ResponseHeaderTimeout: time.Second * 30,
			DialContext:           (&net.Dialer{Timeout: time.Second}).DialContext,
		},
		RetryOnStatus: []int{502, 503, 504, 429},
		RetryBackoff:  func(i int) time.Duration { return time.Duration(i) * 100 * time.Millisecond },
		MaxRetries:    3,
	}

	// Add authentication if provided
	if username != "" && password != "" {
		cfg.Username = username
		cfg.Password = password
	}

	es, err := elasticsearch.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("error creating elasticsearch client: %w", err)
	}

	// Test connection
	res, err := es.Info()
	if err != nil {
		return nil, fmt.Errorf("error connecting to elasticsearch: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("elasticsearch returned error: %s", res.String())
	}

	log.Println("Connected to Elasticsearch")

	return &Client{es: es}, nil
}

func (c *Client) Search(ctx context.Context, index string, query map[string]any) (*SearchResponse, error) {
	// Encode query
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(query); err != nil {
		return nil, fmt.Errorf("error encoding query: %w", err)
	}

	// Create request
	req := esapi.SearchRequest{
		Index: []string{index},
		Body:  &buf,
	}

	// Execute request
	res, err := req.Do(ctx, c.es)
	if err != nil {
		return nil, fmt.Errorf("error executing search: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		var e map[string]any
		if err := json.NewDecoder(res.Body).Decode(&e); err != nil {
			return nil, fmt.Errorf("error parsing error response: %w", err)
		}

		return nil, fmt.Errorf("search request failed: %v", e)
	}

	// Parse response
	var response SearchResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("error parsing response: %w", err)
	}

	return &response, nil
}

// SearchByID searches for a document by a specific field ID.
func (c *Client) SearchByID(ctx context.Context, index, field, id string) (*Hit, error) {
	query := map[string]any{
		"query": map[string]any{
			"bool": map[string]any{
				"filter": map[string]any{
					"term": map[string]any{
						field: id,
					},
				},
			},
		},
		"_source": map[string]any{
			"includes": []string{"value"},
		},
		"size": 1,
	}

	response, err := c.Search(ctx, index, query)
	if err != nil {
		return nil, err
	}

	if len(response.Hits.Hits) == 0 {
		return nil, nil // Not found
	}

	return &response.Hits.Hits[0], nil
}

// InfoResponse represents Elasticsearch cluster info
type InfoResponse struct {
	Name    string `json:"name"`
	Version struct {
		Number string `json:"number"`
	} `json:"version"`
}

// Info returns information about the Elasticsearch cluster
func (c *Client) Info(ctx context.Context) (*InfoResponse, error) {
	req := esapi.InfoRequest{}
	res, err := req.Do(ctx, c.es)
	if err != nil {
		return nil, fmt.Errorf("error getting cluster info: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("info request failed: %s", res.String())
	}

	var info InfoResponse
	if err := json.NewDecoder(res.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("error parsing info response: %w", err)
	}

	return &info, nil
}

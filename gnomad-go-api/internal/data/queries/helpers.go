package queries

import (
	"fmt"
	"sort"
	
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

// contains checks if a string slice contains a value
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// uniqueStrings returns unique strings from a slice
func uniqueStrings(slice []string) []string {
	if slice == nil {
		return []string{}
	}
	
	seen := make(map[string]bool)
	var result []string
	
	for _, s := range slice {
		if !seen[s] {
			seen[s] = true
			result = append(result, s)
		}
	}
	
	if result == nil {
		return []string{}
	}
	
	return result
}

// nullIfEmpty returns nil for empty slices (for GraphQL null handling)
func nullIfEmpty[T any](slice []T) []T {
	if len(slice) == 0 {
		return nil
	}
	return slice
}

// Type conversion helpers
func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%v", v)
}

func toStringPtr(v interface{}) *string {
	if v == nil {
		return nil
	}
	s := toString(v)
	if s == "" {
		return nil
	}
	return &s
}

func toInt(v interface{}) int {
	switch val := v.(type) {
	case int:
		return val
	case float64:
		return int(val)
	case float32:
		return int(val)
	case int64:
		return int(val)
	case int32:
		return int(val)
	default:
		return 0
	}
}

func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	default:
		return 0.0
	}
}

func toFloat64Ptr(v interface{}) *float64 {
	if v == nil {
		return nil
	}
	val := toFloat64(v)
	return &val
}

func toBool(v interface{}) bool {
	switch val := v.(type) {
	case bool:
		return val
	case int:
		return val != 0
	case float64:
		return val != 0
	case string:
		return val == "true" || val == "1"
	default:
		return false
	}
}

func toBoolPtr(v interface{}) *bool {
	if v == nil {
		return nil
	}
	b := toBool(v)
	return &b
}

func toStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}
	
	switch val := v.(type) {
	case []string:
		return val
	case []interface{}:
		result := make([]string, 0, len(val))
		for _, item := range val {
			result = append(result, toString(item))
		}
		return result
	default:
		return nil
	}
}

// FlagContext provides context for flag generation
type FlagContext struct {
	IsGene       bool
	IsRegion     bool
	IsTranscript bool
	GeneID       string
	TranscriptID string
}

// sortPopulations sorts populations by ID for consistent ordering
func sortPopulations(populations []*model.PopulationAlleleFrequencies) {
	sort.Slice(populations, func(i, j int) bool {
		return populations[i].ID < populations[j].ID
	})
}

// parseAgeRange parses age range string (e.g., "30-35") into bin edges
func parseAgeRange(ageRange string) (float64, float64, error) {
	// TODO: Implement age range parsing
	// Expected format: "30-35", "<30", ">=80"
	return 0, 0, nil
}

// mergeStringSlices merges multiple string slices and returns unique values
func mergeStringSlices(slices ...[]string) []string {
	seen := make(map[string]bool)
	var result []string
	
	for _, slice := range slices {
		for _, s := range slice {
			if !seen[s] {
				seen[s] = true
				result = append(result, s)
			}
		}
	}
	
	return result
}

// isRsID checks if a variant ID is an rsID (starts with "rs")
func isRsID(id string) bool {
	return len(id) > 2 && id[0:2] == "rs"
}

// isVrsID checks if a variant ID is a VRS ID (starts with "ga4gh:")
func isVrsID(id string) bool {
	return len(id) > 6 && id[0:6] == "ga4gh:"
}

// normalizeChromosome normalizes chromosome names (removes "chr" prefix if present)
func normalizeChromosome(chrom string) string {
	if len(chrom) > 3 && chrom[0:3] == "chr" {
		return chrom[3:]
	}
	return chrom
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// max returns the maximum of two integers  
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
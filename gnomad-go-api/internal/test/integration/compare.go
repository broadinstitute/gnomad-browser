package integration

import (
	"fmt"
	"math"
	"reflect"
	"sort"
	"strings"
)

// CompareResults compares two GraphQL responses with detailed diff reporting
func CompareResults(expected, actual map[string]interface{}) error {
	diffs := compareValues("", expected, actual)
	if len(diffs) > 0 {
		return fmt.Errorf("response differs from snapshot:\n%s", strings.Join(diffs, "\n"))
	}
	return nil
}

func compareValues(path string, expected, actual interface{}) []string {
	var diffs []string

	// Handle nil cases
	if expected == nil && actual == nil {
		return nil
	}
	if expected == nil || actual == nil {
		diffs = append(diffs, fmt.Sprintf("%s: expected %v, got %v", path, expected, actual))
		return diffs
	}

	// Type check
	if reflect.TypeOf(expected) != reflect.TypeOf(actual) {
		diffs = append(diffs, fmt.Sprintf("%s: type mismatch - expected %T, got %T", path, expected, actual))
		return diffs
	}

	switch exp := expected.(type) {
	case map[string]interface{}:
		act := actual.(map[string]interface{})

		// Check all expected keys
		for key, expValue := range exp {
			actValue, ok := act[key]
			if !ok {
				diffs = append(diffs, fmt.Sprintf("%s.%s: missing in actual", path, key))
				continue
			}
			diffs = append(diffs, compareValues(fmt.Sprintf("%s.%s", path, key), expValue, actValue)...)
		}

		// Check for extra keys in actual
		for key := range act {
			if _, ok := exp[key]; !ok {
				diffs = append(diffs, fmt.Sprintf("%s.%s: unexpected in actual", path, key))
			}
		}

	case []interface{}:
		act := actual.([]interface{})

		if len(exp) != len(act) {
			diffs = append(diffs, fmt.Sprintf("%s: array length mismatch - expected %d, got %d", path, len(exp), len(act)))
			return diffs
		}

		for i, expItem := range exp {
			diffs = append(diffs, compareValues(fmt.Sprintf("%s[%d]", path, i), expItem, act[i])...)
		}

	case float64:
		// Use epsilon comparison for floats
		actFloat, ok := actual.(float64)
		if !ok {
			diffs = append(diffs, fmt.Sprintf("%s: type mismatch - expected float64, got %T", path, actual))
			return diffs
		}

		const epsilon = 1e-9
		if math.Abs(exp-actFloat) > epsilon {
			diffs = append(diffs, fmt.Sprintf("%s: expected %v, got %v (diff: %v)", path, exp, actFloat, math.Abs(exp-actFloat)))
		}

	default:
		// Other primitive values
		if !reflect.DeepEqual(expected, actual) {
			diffs = append(diffs, fmt.Sprintf("%s: expected %v, got %v", path, expected, actual))
		}
	}

	return diffs
}

// sortObjectKeys recursively sorts object keys for deterministic comparison
func sortObjectKeys(obj interface{}) interface{} {
	switch v := obj.(type) {
	case map[string]interface{}:
		// Get sorted keys
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		// Create new map with sorted keys
		result := make(map[string]interface{})
		for _, key := range keys {
			result[key] = sortObjectKeys(v[key])
		}
		return result
	case []interface{}:
		// Recursively sort each element
		for i, item := range v {
			v[i] = sortObjectKeys(item)
		}
		return v
	default:
		return obj
	}
}

// NormalizeResponse sorts arrays and removes null/empty fields for consistent comparison
func NormalizeResponse(data map[string]interface{}) map[string]interface{} {
	// First sort all keys recursively for deterministic comparison
	sorted := sortObjectKeys(data).(map[string]interface{})

	normalized := make(map[string]interface{})

	for key, value := range sorted {
		switch v := value.(type) {
		case map[string]interface{}:
			normalized[key] = NormalizeResponse(v)
		case []interface{}:
			if len(v) > 0 {
				// Determine sort key based on content
				if m, ok := v[0].(map[string]interface{}); ok {
					// Sort by appropriate field
					if _, hasID := m["id"]; hasID {
						// Sort populations by id
						sort.Slice(v, func(i, j int) bool {
							id1, _ := v[i].(map[string]interface{})["id"].(string)
							id2, _ := v[j].(map[string]interface{})["id"].(string)
							return id1 < id2
						})
					} else if _, hasTranscriptID := m["transcript_id"]; hasTranscriptID {
						// Sort transcript_consequences by transcript_id
						sort.Slice(v, func(i, j int) bool {
							id1, _ := v[i].(map[string]interface{})["transcript_id"].(string)
							id2, _ := v[j].(map[string]interface{})["transcript_id"].(string)
							return id1 < id2
						})
					}
				}
				normalized[key] = v
			}
		default:
			if value != nil {
				normalized[key] = value
			}
		}
	}

	return normalized
}

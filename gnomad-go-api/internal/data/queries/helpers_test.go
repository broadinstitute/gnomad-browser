package queries

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetFlagsForContext(t *testing.T) {
	tests := []struct {
		name     string
		variant  map[string]interface{}
		context  FlagContext
		subset   string
		expected []string
	}{
		{
			name: "regional flags from exome",
			variant: map[string]interface{}{
				"flags": []string{"monoallelic"},
				"exome": map[string]interface{}{
					"freq": map[string]interface{}{
						"non_ukb": map[string]interface{}{
							"ac":      float64(10),
							"filters": []interface{}{"lcr", "segdup"},
						},
					},
				},
			},
			context:  FlagContext{Type: "region"},
			subset:   "non_ukb",
			expected: []string{"monoallelic", "lcr", "segdup"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetFlagsForContext(tt.variant, tt.context, tt.subset)
			assert.ElementsMatch(t, tt.expected, result)
		})
	}
}

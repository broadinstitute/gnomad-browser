package queries

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEstimateHaplotypeCounts(t *testing.T) {
	tests := []struct {
		name           string
		genotypeCounts []int
		expectedLength int
	}{
		{
			name:           "no double heterozygotes",
			genotypeCounts: []int{100, 10, 5, 8, 0, 2, 3, 1, 0}, // AaBb = 0
			expectedLength: 4,
		},
		{
			name:           "with double heterozygotes",
			genotypeCounts: []int{100, 10, 5, 8, 5, 2, 3, 1, 0}, // AaBb = 5
			expectedLength: 4,
		},
		{
			name:           "all reference",
			genotypeCounts: []int{100, 0, 0, 0, 0, 0, 0, 0, 0},
			expectedLength: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := estimateHaplotypeCounts(tt.genotypeCounts)
			assert.Equal(t, tt.expectedLength, len(result), "Should return 4 haplotype counts")
			
			// All counts should be non-negative
			for i, count := range result {
				assert.GreaterOrEqual(t, count, 0.0, "Haplotype count %d should be non-negative", i)
			}
		})
	}
}

func TestHaplotypeFreqEM(t *testing.T) {
	tests := []struct {
		name           string
		genotypeCounts []int
		expectedLength int
		shouldConverge bool
	}{
		{
			name:           "valid input with 9 counts",
			genotypeCounts: []int{100, 10, 5, 8, 5, 2, 3, 1, 0},
			expectedLength: 4,
			shouldConverge: true,
		},
		{
			name:           "invalid input with wrong length",
			genotypeCounts: []int{100, 10, 5},
			expectedLength: 4,
			shouldConverge: false,
		},
		{
			name:           "all reference samples",
			genotypeCounts: []int{100, 0, 0, 0, 0, 0, 0, 0, 0},
			expectedLength: 4,
			shouldConverge: false, // Should return zeros
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := haplotypeFreqEM(tt.genotypeCounts)
			assert.Equal(t, tt.expectedLength, len(result), "Should return 4 haplotype counts")
			
			// All counts should be non-negative
			for i, count := range result {
				assert.GreaterOrEqual(t, count, 0.0, "Haplotype count %d should be non-negative", i)
			}

			if !tt.shouldConverge {
				// For edge cases, might return all zeros
				allZero := true
				for _, count := range result {
					if count != 0.0 {
						allZero = false
						break
					}
				}
				if !allZero {
					t.Logf("Expected all zeros for edge case, got: %v", result)
				}
			}
		})
	}
}

func TestGetProbabilityCompoundHeterozygous(t *testing.T) {
	tests := []struct {
		name            string
		haplotypeCounts []float64
		expectNil       bool
		expectRange     bool
	}{
		{
			name:            "valid haplotype counts",
			haplotypeCounts: []float64{100.0, 10.0, 15.0, 80.0}, // AB, aB, Ab, ab
			expectNil:       false,
			expectRange:     true,
		},
		{
			name:            "invalid length",
			haplotypeCounts: []float64{100.0, 10.0},
			expectNil:       true,
			expectRange:     false,
		},
		{
			name:            "zero denominator case",
			haplotypeCounts: []float64{0.0, 0.0, 0.0, 0.0},
			expectNil:       true,
			expectRange:     false,
		},
		{
			name:            "all in cis configuration",
			haplotypeCounts: []float64{100.0, 0.0, 0.0, 50.0}, // Only AB and ab
			expectNil:       false,
			expectRange:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getProbabilityCompoundHeterozygous(tt.haplotypeCounts)
			
			if tt.expectNil {
				assert.Nil(t, result, "Should return nil for invalid input")
			} else {
				assert.NotNil(t, result, "Should return a value for valid input")
				if result != nil && tt.expectRange {
					assert.GreaterOrEqual(t, *result, 0.0, "Probability should be >= 0")
					assert.LessOrEqual(t, *result, 1.0, "Probability should be <= 1")
				}
			}
		})
	}
}

func TestMinFunction(t *testing.T) {
	tests := []struct {
		name     string
		a        int
		b        int
		expected int
	}{
		{
			name:     "a smaller than b",
			a:        5,
			b:        10,
			expected: 5,
		},
		{
			name:     "b smaller than a",
			a:        10,
			b:        5,
			expected: 5,
		},
		{
			name:     "equal values",
			a:        7,
			b:        7,
			expected: 7,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := min(tt.a, tt.b)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCodingAndUTRVepConsequences(t *testing.T) {
	// Test that our VEP consequences map includes expected values
	expectedConsequences := []string{
		"missense_variant",
		"synonymous_variant",
		"stop_gained",
		"frameshift_variant",
		"splice_acceptor_variant",
		"splice_donor_variant",
		"five_prime_UTR_variant",
		"three_prime_UTR_variant",
	}

	for _, consequence := range expectedConsequences {
		t.Run("has_"+consequence, func(t *testing.T) {
			assert.True(t, codingAndUTRVepConsequences[consequence], 
				"Should include %s as a coding/UTR consequence", consequence)
		})
	}

	// Test that non-coding consequences are not included
	nonCodingConsequences := []string{
		"intron_variant",
		"intergenic_variant",
		"upstream_gene_variant",
		"downstream_gene_variant",
	}

	for _, consequence := range nonCodingConsequences {
		t.Run("excludes_"+consequence, func(t *testing.T) {
			assert.False(t, codingAndUTRVepConsequences[consequence], 
				"Should not include %s as a coding/UTR consequence", consequence)
		})
	}
}
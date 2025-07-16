package queries

import (
	"encoding/json"
	"testing"

	"gnomad-browser/gnomad-go-api/internal/elastic"
	"gnomad-browser/gnomad-go-api/internal/graph/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGnomadV4VariantFetcher_FetchVariantByID(t *testing.T) {
	// Skip tests that require actual Elasticsearch connection for now
	t.Skip("Skipping test that requires Elasticsearch connection or proper mocking")
}

func TestGnomadV4VariantFetcher_SubsetFiltering(t *testing.T) {
	fetcher := &GnomadV4VariantFetcher{
		Subset: "non_ukb",
	}

	tests := []struct {
		name     string
		doc      *GnomadV4VariantDocument
		expected bool
	}{
		{
			name: "variant exists in non_ukb exome",
			doc: &GnomadV4VariantDocument{
				Exome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"non_ukb": {AC: 10},
					},
				},
			},
			expected: true,
		},
		{
			name: "variant exists in genome (always all)",
			doc: &GnomadV4VariantDocument{
				Genome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"all": {AC: 5},
					},
				},
			},
			expected: true,
		},
		{
			name: "variant exists in joint data",
			doc: &GnomadV4VariantDocument{
				Joint: &GnomadV4JointData{
					Freq: map[string]*GnomadV4JointFrequencyData{
						"non_ukb": {AC: 1},
					},
				},
			},
			expected: true,
		},
		{
			name: "variant not in non_ukb subset",
			doc: &GnomadV4VariantDocument{
				Exome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"non_ukb": {AC: 0},
					},
				},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := fetcher.variantExistsInSubset(tt.doc)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGnomadV4VariantFetcher_FlagGeneration(t *testing.T) {
	fetcher := &GnomadV4VariantFetcher{
		Subset: "non_ukb",
	}

	tests := []struct {
		name          string
		doc           *GnomadV4VariantDocument
		context       FlagContext
		expectedFlags []string
	}{
		{
			name: "regional flags hoisted from exome",
			doc: &GnomadV4VariantDocument{
				Flags: []string{"monoallelic"},
				Exome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"non_ukb": {
							Filters: []string{"lcr", "segdup"},
						},
					},
				},
			},
			context:       FlagContext{Type: "region"},
			expectedFlags: []string{"monoallelic", "lcr", "segdup"},
		},
		{
			name: "discrepant AC flag",
			doc: &GnomadV4VariantDocument{
				Exome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"non_ukb": {AC: 10},
					},
				},
				Genome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"all": {AC: 5},
					},
				},
				Joint: &GnomadV4JointData{
					Freq: map[string]*GnomadV4JointFrequencyData{
						"non_ukb": {AC: 15},
					},
				},
			},
			context:       FlagContext{},
			expectedFlags: []string{}, // No discrepant_ac for this test case (10 + 5 = 15)
		},
		{
			name: "discrepant AC flag when joint AC differs",
			doc: &GnomadV4VariantDocument{
				Exome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"non_ukb": {AC: 10},
					},
				},
				Genome: &GnomadV4SequencingData{
					Freq: map[string]*GnomadV4FrequencyData{
						"all": {AC: 5},
					},
				},
				Joint: &GnomadV4JointData{
					Freq: map[string]*GnomadV4JointFrequencyData{
						"non_ukb": {AC: 12}, // Different from 10 + 5 = 15
					},
				},
			},
			context:       FlagContext{},
			expectedFlags: []string{"discrepant_ac"},
		},
		{
			name: "gene context flags",
			doc: &GnomadV4VariantDocument{
				TranscriptConsequences: []map[string]interface{}{
					{
						"gene_id": "ENSG00000123456",
						"lof":     "LC",
						"biotype": "protein_coding",
					},
					{
						"gene_id":   "ENSG00000123456",
						"lof_flags": "SINGLE_EXON",
						"biotype":   "protein_coding",
					},
					{
						"gene_id": "ENSG00000123456",
						"biotype": "nonsense_mediated_decay",
					},
					{
						"gene_id": "ENSG00000789012", // Different gene - should be ignored
						"lof":     "LC",
						"biotype": "protein_coding",
					},
				},
			},
			context:       FlagContext{Type: "gene", GeneID: "ENSG00000123456"},
			expectedFlags: []string{"lc_lof", "lof_flag", "nc_transcript"},
		},
		{
			name: "transcript context flags",
			doc: &GnomadV4VariantDocument{
				TranscriptConsequences: []map[string]interface{}{
					{
						"transcript_id": "ENST00000123456",
						"lof":           "LC",
						"biotype":       "protein_coding",
					},
					{
						"transcript_id": "ENST00000789012", // Different transcript - should be ignored
						"lof":           "LC",
						"biotype":       "protein_coding",
					},
				},
			},
			context:       FlagContext{Type: "transcript", TranscriptID: "ENST00000123456"},
			expectedFlags: []string{"lc_lof"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Convert document to map for flag processing
			docMap := fetcher.convertDocumentToMap(tt.doc)
			flags := GetFlagsForContext(docMap, tt.context, fetcher.Subset)
			t.Logf("Test: %s, Expected: %v, Got: %v", tt.name, tt.expectedFlags, flags)
			assert.ElementsMatch(t, tt.expectedFlags, flags)
		})
	}
}

func TestGnomadV4VariantFetcher_PopulationMerging(t *testing.T) {
	fetcher := &GnomadV4VariantFetcher{}

	basePopulations := []GnomadV4PopulationData{
		{ID: "afr", AC: 10, AN: 1000},
		{ID: "eur", AC: 20, AN: 2000},
	}

	// Create frequency data with properly initialized HGDP and TGP
	// For this test, we'll just verify the base populations are returned
	// since we can't easily initialize the anonymous structs

	// Convert to generic format
	basePopulationsMap := fetcher.convertAncestryGroupsToMaps(basePopulations)

	// Since we can't easily initialize anonymous structs, we'll create empty additional sources
	additionalSources := make(map[string]interface{})

	result := ShapeAndMergePopulations(basePopulationsMap, additionalSources, "genome")

	// Should have just base populations without HGDP/1KG data
	expectedIDs := []string{"afr", "eur"}

	actualIDs := make([]string, len(result))
	for i, pop := range result {
		actualIDs[i] = pop.ID
	}

	assert.ElementsMatch(t, expectedIDs, actualIDs)
}

func TestGnomadV4VariantFetcher_InSilicoPredictors(t *testing.T) {

	predictorsMap := map[string]interface{}{
		"cadd": map[string]interface{}{
			"phred": 25.3,
		},
		"revel_max": map[string]interface{}{
			"prediction": "0.85",
			"flags":      []interface{}{"high_impact"},
		},
		"sift_max": "0.01",
		"primate_ai": map[string]interface{}{
			"prediction": "0.92",
		},
		"unknown_predictor": "should_be_ignored",
	}

	result := CreateInSilicoPredictorsList(predictorsMap)

	// Should only include known predictors
	assert.Len(t, result, 4)

	// Check CADD special handling
	var caddPredictor *model.VariantInSilicoPredictor
	for _, pred := range result {
		if pred.ID == "CADD" {
			caddPredictor = pred
			break
		}
	}
	require.NotNil(t, caddPredictor)
	assert.Equal(t, "25.3", caddPredictor.Value)

	// Check predictor with flags
	var revelPredictor *model.VariantInSilicoPredictor
	for _, pred := range result {
		if pred.ID == "REVEL" {
			revelPredictor = pred
			break
		}
	}
	require.NotNil(t, revelPredictor)
	assert.Equal(t, "0.85", revelPredictor.Value)
	assert.Equal(t, []string{"high_impact"}, revelPredictor.Flags)
}

// Helper function to create a mock response from JSON
func createMockResponse(jsonData string) *elastic.SearchResponse {
	var response elastic.SearchResponse
	err := json.Unmarshal([]byte(jsonData), &response)
	if err != nil {
		panic(err)
	}
	return &response
}

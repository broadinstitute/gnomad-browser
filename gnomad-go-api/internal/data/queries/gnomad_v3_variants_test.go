package queries

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gnomad-browser/gnomad-go-api/internal/graph/model"
)

func TestGnomadV3VariantFetcher_variantExistsInSubset(t *testing.T) {
	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	tests := []struct {
		name     string
		doc      *GnomadV3VariantDocument
		expected bool
	}{
		{
			name: "variant exists with AC > 0",
			doc: &GnomadV3VariantDocument{
				Genome: &GnomadV3GenomeData{
					Freq: map[string]*GnomadV3FrequencyData{
						"all": {
							ACRaw: 5,
						},
					},
				},
			},
			expected: true,
		},
		{
			name: "variant exists with AC = 0",
			doc: &GnomadV3VariantDocument{
				Genome: &GnomadV3GenomeData{
					Freq: map[string]*GnomadV3FrequencyData{
						"all": {
							ACRaw: 0,
						},
					},
				},
			},
			expected: false,
		},
		{
			name: "variant missing genome data",
			doc: &GnomadV3VariantDocument{
				Genome: nil,
			},
			expected: false,
		},
		{
			name: "variant missing freq data",
			doc: &GnomadV3VariantDocument{
				Genome: &GnomadV3GenomeData{
					Freq: nil,
				},
			},
			expected: false,
		},
		{
			name: "variant missing subset data",
			doc: &GnomadV3VariantDocument{
				Genome: &GnomadV3GenomeData{
					Freq: map[string]*GnomadV3FrequencyData{
						"other_subset": {
							ACRaw: 5,
						},
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

func TestGnomadV3VariantFetcher_shapeAndMergePopulations(t *testing.T) {
	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	basePopulations := []GnomadV3PopulationData{
		{ID: "afr", AC: 10, AN: 100, HomozygoteCount: 1, HemizygoteCount: 0},
		{ID: "eas", AC: 5, AN: 50, HomozygoteCount: 0, HemizygoteCount: 0},
	}

	freqData := &GnomadV3FrequencyData{
		AC:              15,
		AN:              150,
		HomozygoteCount: 1,
		HemizygoteCount: 0,
		Populations:     basePopulations,
		HGDP: &struct {
			AC          int                      `json:"ac"`
			AN          int                      `json:"an"`
			ACRaw       int                      `json:"ac_raw"`
			ANRaw       int                      `json:"an_raw"`
			Populations []GnomadV3PopulationData `json:"populations"`
		}{
			AC:    2,
			AN:    20,
			ACRaw: 3,
			ANRaw: 30,
			Populations: []GnomadV3PopulationData{
				{ID: "central_asia", AC: 1, AN: 10, HomozygoteCount: 0, HemizygoteCount: 0},
				{ID: "east_asia", AC: 1, AN: 10, HomozygoteCount: 0, HemizygoteCount: 0},
			},
		},
		TGP: &struct {
			AC          int                      `json:"ac"`
			AN          int                      `json:"an"`
			ACRaw       int                      `json:"ac_raw"`
			ANRaw       int                      `json:"an_raw"`
			Populations []GnomadV3PopulationData `json:"populations"`
		}{
			AC:    3,
			AN:    30,
			ACRaw: 4,
			ANRaw: 40,
			Populations: []GnomadV3PopulationData{
				{ID: "AFR", AC: 1, AN: 10, HomozygoteCount: 0, HemizygoteCount: 0},
				{ID: "EAS", AC: 2, AN: 20, HomozygoteCount: 0, HemizygoteCount: 0},
			},
		},
	}

	result := fetcher.shapeAndMergePopulations(basePopulations, freqData)

	// Should have base populations + HGDP with prefix + 1KG with prefix
	expectedMinLength := 2 + 2 + 2 // base + HGDP + 1KG
	assert.GreaterOrEqual(t, len(result), expectedMinLength, "Should have all populations merged")

	// Check for proper prefixes
	hgdpFound := false
	tgpFound := false
	baseFound := false

	for _, pop := range result {
		if len(pop.ID) >= 5 && pop.ID[:5] == "hgdp:" {
			hgdpFound = true
		} else if len(pop.ID) >= 4 && pop.ID[:4] == "1kg:" {
			tgpFound = true
		} else {
			baseFound = true
		}
	}

	assert.True(t, baseFound, "Should have base populations")
	assert.True(t, hgdpFound, "Should have HGDP populations with prefix")
	assert.True(t, tgpFound, "Should have 1KG populations with prefix")
}

func TestGnomadV3VariantFetcher_shapeAndMergePopulations_NonV2Subset(t *testing.T) {
	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes_non_v2",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "non_v2",
	}

	basePopulations := []GnomadV3PopulationData{
		{ID: "afr", AC: 10, AN: 100, HomozygoteCount: 1, HemizygoteCount: 0},
	}

	freqData := &GnomadV3FrequencyData{
		AC:              10,
		AN:              100,
		HomozygoteCount: 1,
		HemizygoteCount: 0,
		Populations:     basePopulations,
		TGP: &struct {
			AC          int                      `json:"ac"`
			AN          int                      `json:"an"`
			ACRaw       int                      `json:"ac_raw"`
			ANRaw       int                      `json:"an_raw"`
			Populations []GnomadV3PopulationData `json:"populations"`
		}{
			AC:    3,
			AN:    30,
			ACRaw: 4,
			ANRaw: 40,
			Populations: []GnomadV3PopulationData{
				{ID: "AFR", AC: 1, AN: 10, HomozygoteCount: 0, HemizygoteCount: 0},
			},
		},
	}

	result := fetcher.shapeAndMergePopulations(basePopulations, freqData)

	// Should have base populations but NOT 1KG populations for non_v2 subset
	tgpFound := false
	for _, pop := range result {
		if len(pop.ID) >= 4 && pop.ID[:4] == "1kg:" {
			tgpFound = true
		}
	}

	assert.False(t, tgpFound, "Should not have 1KG populations for non_v2 subset")
}

func TestGnomadV3VariantFetcher_createInSilicoPredictorsList(t *testing.T) {
	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	phredValue := 15.5
	revelValue := 0.123
	spliceValue := 0.456
	primateValue := 0.789

	predictors := GnomadV3InSilicoPredictors{
		CADD: &struct {
			Phred        *float64 `json:"phred"`
			HasDuplicate bool     `json:"has_duplicate"`
		}{
			Phred:        &phredValue,
			HasDuplicate: true,
		},
		REVEL: &struct {
			REVELScore   *float64 `json:"revel_score"`
			HasDuplicate bool     `json:"has_duplicate"`
		}{
			REVELScore:   &revelValue,
			HasDuplicate: false,
		},
		SpliceAI: &struct {
			SpliceAIScore     *float64 `json:"splice_ai_score"`
			SpliceConsequence string   `json:"splice_consequence"`
			HasDuplicate      bool     `json:"has_duplicate"`
		}{
			SpliceAIScore:     &spliceValue,
			SpliceConsequence: "donor_gain",
			HasDuplicate:      false,
		},
		PrimateAI: &struct {
			PrimateAIScore *float64 `json:"primate_ai_score"`
			HasDuplicate   bool     `json:"has_duplicate"`
		}{
			PrimateAIScore: &primateValue,
			HasDuplicate:   false,
		},
	}

	// Convert struct to map
	predictorsMap := fetcher.convertInSilicoPredictorsToMap(predictors)
	result := CreateInSilicoPredictorsList(predictorsMap)

	require.Len(t, result, 3, "Should have 3 predictors")

	// Check each predictor
	predictorMap := make(map[string]*model.VariantInSilicoPredictor)
	for _, pred := range result {
		predictorMap[pred.ID] = pred
	}

	// CADD
	cadd := predictorMap["CADD"]
	require.NotNil(t, cadd, "CADD predictor should exist")
	assert.Equal(t, "15.5", cadd.Value)
	assert.Empty(t, cadd.Flags)

	// REVEL
	revel := predictorMap["REVEL"]
	require.NotNil(t, revel, "REVEL predictor should exist")
	assert.Equal(t, "0.123", revel.Value)
	assert.Empty(t, revel.Flags)

	// SpliceAI
	splice := predictorMap["SpliceAI"]
	require.NotNil(t, splice, "SpliceAI predictor should exist")
	assert.Equal(t, "0.456", splice.Value)
	assert.Empty(t, splice.Flags)

	// PrimateAI - might not be included since it's not in the predictor list
	// The helper only includes specific predictors
}

func TestGnomadV3VariantFetcher_buildVariantQuery(t *testing.T) {
	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	query := fetcher.buildVariantQuery("variant_id", "1-55039774-C-T")

	// Verify query structure
	assert.NotNil(t, query["query"])
	assert.NotNil(t, query["_source"])
	assert.Equal(t, 1, query["size"])

	// Verify nested structure
	queryObj := query["query"].(map[string]any)
	boolObj := queryObj["bool"].(map[string]any)
	filterObj := boolObj["filter"].(map[string]any)
	termObj := filterObj["term"].(map[string]any)

	assert.Equal(t, "1-55039774-C-T", termObj["variant_id"])
}

func TestGnomadV3VariantFetcher_GetDatasetID(t *testing.T) {
	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	assert.Equal(t, "gnomad_r3_genomes", fetcher.GetDatasetID())
}

func TestGnomadV3VariantFetcher_GetReferenceGenome(t *testing.T) {
	fetcher := &GnomadV3VariantFetcher{
		BaseVariantFetcher: BaseVariantFetcher{
			DatasetID:       "gnomad_r3_genomes",
			ReferenceGenome: model.ReferenceGenomeIDGRCh38,
			ESIndex:         "gnomad_v3_variants",
		},
		Subset: "all",
	}

	assert.Equal(t, model.ReferenceGenomeIDGRCh38, fetcher.GetReferenceGenome())
}

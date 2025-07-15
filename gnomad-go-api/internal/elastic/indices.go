package elastic

import "fmt"

// GetVariantIndex returns the Elasticsearch index name for a dataset's variants.
func GetVariantIndex(dataset, subset string) string {
	switch dataset {
	case "gnomad_r4", "gnomad_r4_non_ukb":
		if subset != "" && subset != "all" {
			return fmt.Sprintf("gnomad_v4_variants_%s", subset)
		}

		return "gnomad_v4_variants"
	case "gnomad_r2_1":
		return "gnomad_v2_1_1_variants"
	// Add other dataset mappings
	default:
		return ""
	}
}

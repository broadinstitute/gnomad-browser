package queries

import (
	"encoding/json"
	"fmt"
)

// DebugPopulationData prints the raw population data for debugging
func DebugPopulationData(popData []map[string]interface{}, label string) {
	fmt.Printf("\n=== DEBUG: %s ===\n", label)
	for _, pop := range popData {
		id := pop["id"]
		ac := pop["ac"]
		an := pop["an"]
		homCount := pop["homozygote_count"]
		hemiCount := pop["hemizygote_count"]
		
		// Only print populations with non-zero homozygote counts
		if homCount != nil && homCount.(float64) > 0 {
			fmt.Printf("Population %s: ac=%v, an=%v, homozygote_count=%v, hemizygote_count=%v\n",
				id, ac, an, homCount, hemiCount)
		}
	}
	
	// Also print full JSON for inspection
	data, _ := json.MarshalIndent(popData, "", "  ")
	fmt.Printf("\nFull population data:\n%s\n", string(data))
}
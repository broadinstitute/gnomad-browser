package integration

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestVariantQueriesAgainstSnapshots(t *testing.T) {
	// Skip if running short tests
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	// Setup test server
	t.Log("Setting up test server...")
	ts := SetupTestServer(t)
	defer ts.Server.Close()
	t.Logf("Test server running at: %s", ts.Server.URL)

	// Load snapshots (auto-detects migration_tests directory)
	t.Log("Loading snapshots...")
	snapshots, err := LoadSnapshots(".")
	require.NoError(t, err)
	require.NotEmpty(t, snapshots, "No snapshots found")
	t.Logf("Loaded %d snapshot tests", len(snapshots))

	// Track test results
	passed := 0
	failed := 0

	// Run each snapshot test
	for _, snapshot := range snapshots {
		t.Run(snapshot.Name, func(t *testing.T) {
			t.Logf("Running test: %s", snapshot.Name)

			// Execute query
			actual, err := ts.ExecuteGraphQLQuery(snapshot.Query, snapshot.Variables)
			if err != nil {
				t.Errorf("GraphQL query execution failed: %v", err)
				failed++
				return
			}

			// Normalize both responses
			expectedNorm := NormalizeResponse(snapshot.Expected)
			actualNorm := NormalizeResponse(actual)

			// Compare
			err = CompareResults(expectedNorm, actualNorm)
			if err != nil {
				// Pretty print for debugging
				expectedJSON, _ := json.MarshalIndent(expectedNorm, "", "  ")
				actualJSON, _ := json.MarshalIndent(actualNorm, "", "  ")

				t.Errorf("Snapshot comparison failed:\n%v\n\nExpected:\n%s\n\nActual:\n%s",
					err, expectedJSON, actualJSON)
				failed++
			} else {
				t.Logf("✓ Test passed: %s", snapshot.Name)
				passed++
			}
		})
	}

	// Summary
	t.Logf("Integration test summary: %d passed, %d failed", passed, failed)
}

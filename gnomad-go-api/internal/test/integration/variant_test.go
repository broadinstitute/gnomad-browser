package integration

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
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

	// Categorize tests for better debugging
	_ = categorizeTests(snapshots)

	// Get current working directory
	wd, _ := os.Getwd()
	t.Logf("Current working directory: %s", wd)

	// Create logs directory - use absolute path from the start
	baseDir := wd
	if strings.Contains(wd, "/internal/test/integration") {
		// We're running from within the test directory, go back to project root
		baseDir = filepath.Join(wd, "../../../")
	}
	logsDir := filepath.Join(baseDir, "test_logs")

	// Clean up and create directory
	os.RemoveAll(logsDir)
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		t.Logf("ERROR: Could not create logs directory %s: %v", logsDir, err)
		// Try current directory as fallback
		logsDir = "test_logs"
		os.MkdirAll(logsDir, 0755)
	}

	// Verify directory was created
	if stat, err := os.Stat(logsDir); err == nil {
		t.Logf("✓ Created test logs directory: %s (is dir: %v)", logsDir, stat.IsDir())
	} else {
		t.Logf("✗ Failed to verify logs directory %s: %v", logsDir, err)
	}

	// Track test results
	passed := 0
	failed := 0
	categoryResults := make(map[string]struct {
		passed   int
		failed   int
		failures []string
	})

	// Run each snapshot test
	for _, snapshot := range snapshots {
		t.Run(snapshot.Name, func(t *testing.T) {
			category := getTestCategory(snapshot.Name)
			t.Logf("Running test: %s [Category: %s]", snapshot.Name, category)

			// Execute query
			actual, err := ts.ExecuteGraphQLQuery(snapshot.Query, snapshot.Variables)
			if err != nil {
				t.Errorf("GraphQL query execution failed: %v", err)
				failed++
				updateCategoryResults(categoryResults, category, false, snapshot.Name)
				return
			}

			// Normalize both responses
			expectedNorm := NormalizeResponse(snapshot.Expected)
			actualNorm := NormalizeResponse(actual)

			// Compare
			err = CompareResults(expectedNorm, actualNorm)

			// Write concise log for this test
			logFile := filepath.Join(logsDir, fmt.Sprintf("%s.json", snapshot.Name))
			logData := map[string]interface{}{
				"test":     snapshot.Name,
				"category": category,
				"passed":   err == nil,
			}

			if err != nil {
				// Parse error details
				errorStr := err.Error()
				missingFields := []string{}
				unexpectedFields := []string{}
				valueMismatches := []string{}

				// Extract specific errors from the error message
				lines := strings.Split(errorStr, "\n")
				currentSection := ""
				for _, line := range lines {
					line = strings.TrimSpace(line)
					if strings.Contains(line, "Missing Fields") {
						currentSection = "missing"
					} else if strings.Contains(line, "Unexpected Fields") {
						currentSection = "unexpected"
					} else if strings.Contains(line, "Value Mismatches") {
						currentSection = "mismatch"
					} else if line != "" && !strings.HasPrefix(line, "===") && !strings.HasPrefix(line, "response differs") {
						switch currentSection {
						case "missing":
							missingFields = append(missingFields, line)
						case "unexpected":
							unexpectedFields = append(unexpectedFields, line)
						case "mismatch":
							valueMismatches = append(valueMismatches, line)
						}
					}
				}

				logData["error"] = map[string]interface{}{
					"summary":           "Test failed",
					"missing_fields":    missingFields,
					"unexpected_fields": unexpectedFields,
					"value_mismatches":  valueMismatches,
				}

				// Add actual error if it's a GraphQL error
				if actualNorm["errors"] != nil {
					logData["graphql_errors"] = actualNorm["errors"]
				}

				// Pretty print for debugging
				expectedJSON, _ := json.MarshalIndent(expectedNorm, "", "  ")
				actualJSON, _ := json.MarshalIndent(actualNorm, "", "  ")

				t.Errorf("Snapshot comparison failed:\n%v\n\nExpected:\n%s\n\nActual:\n%s",
					err, expectedJSON, actualJSON)
				failed++
				updateCategoryResults(categoryResults, category, false, snapshot.Name)
			} else {
				t.Logf("✓ Test passed: %s", snapshot.Name)
				passed++
				updateCategoryResults(categoryResults, category, true, snapshot.Name)
			}

			// Write JSON log file
			logJSON, _ := json.MarshalIndent(logData, "", "  ")
			if err := os.WriteFile(logFile, logJSON, 0644); err != nil {
				t.Errorf("Failed to write log file %s: %v", logFile, err)
			}
		})
	}

	// Summary
	t.Logf("\n=== INTEGRATION TEST SUMMARY ===")
	t.Logf("Overall: %d passed, %d failed", passed, failed)
	t.Logf("\n=== RESULTS BY CATEGORY ===")

	// Sort categories for consistent output
	var categories []string
	for cat := range categoryResults {
		categories = append(categories, cat)
	}
	sort.Strings(categories)

	// Build summary for file output
	var summaryLines []string
	summaryLines = append(summaryLines, fmt.Sprintf("=== INTEGRATION TEST SUMMARY ==="))
	summaryLines = append(summaryLines, fmt.Sprintf("Overall: %d passed, %d failed", passed, failed))
	summaryLines = append(summaryLines, fmt.Sprintf("\n=== RESULTS BY CATEGORY ==="))

	for _, cat := range categories {
		results := categoryResults[cat]
		t.Logf("\n%s:", cat)
		t.Logf("  Passed: %d", results.passed)
		t.Logf("  Failed: %d", results.failed)

		summaryLines = append(summaryLines, fmt.Sprintf("\n%s:", cat))
		summaryLines = append(summaryLines, fmt.Sprintf("  Passed: %d", results.passed))
		summaryLines = append(summaryLines, fmt.Sprintf("  Failed: %d", results.failed))

		if len(results.failures) > 0 {
			t.Logf("  Failed tests:")
			summaryLines = append(summaryLines, "  Failed tests:")
			for _, name := range results.failures {
				t.Logf("    - %s", name)
				summaryLines = append(summaryLines, fmt.Sprintf("    - %s", name))
			}
		}
	}

	// Write summary to file for easier analysis
	summaryFile := "test_summary.txt"
	absSummaryFile, _ := filepath.Abs(summaryFile)
	err = os.WriteFile(summaryFile, []byte(strings.Join(summaryLines, "\n")), 0644)
	if err == nil {
		t.Logf("\nDetailed test summary written to: %s", absSummaryFile)
	} else {
		t.Logf("\nError writing test summary: %v", err)
	}
}

// Helper functions for categorization
func categorizeTests(snapshots []SnapshotTest) map[string][]string {
	categories := make(map[string][]string)
	for _, s := range snapshots {
		cat := getTestCategory(s.Name)
		categories[cat] = append(categories[cat], s.Name)
	}
	return categories
}

func getTestCategory(testName string) string {
	switch {
	case strings.Contains(testName, "copy-number-variant"):
		return "Copy Number Variants"
	case strings.Contains(testName, "structural-variant"):
		return "Structural Variants"
	case strings.Contains(testName, "gene-page"):
		return "Gene Pages"
	case strings.Contains(testName, "gene-coverage"):
		return "Gene Coverage"
	case strings.Contains(testName, "region-page"):
		return "Region Pages"
	case strings.Contains(testName, "region-coverage"):
		return "Region Coverage"
	case strings.Contains(testName, "transcript-page"):
		return "Transcript Pages"
	case strings.Contains(testName, "transcript-coverage"):
		return "Transcript Coverage"
	case strings.Contains(testName, "variant-page"):
		return "Variant Pages"
	case strings.Contains(testName, "variant-search"):
		return "Variant Search"
	case strings.Contains(testName, "variants-in-"):
		return "Variants in Region/Gene/Transcript"
	case strings.Contains(testName, "variant-"):
		return "Variant Queries"
	case strings.Contains(testName, "short-tandem-repeat"):
		return "Short Tandem Repeats"
	case strings.Contains(testName, "mitochondrial"):
		return "Mitochondrial Variants"
	default:
		return "Other"
	}
}

func updateCategoryResults(results map[string]struct {
	passed   int
	failed   int
	failures []string
}, category string, isPassed bool, testName string) {
	r := results[category]
	if isPassed {
		r.passed++
	} else {
		r.failed++
		r.failures = append(r.failures, testName)
	}
	results[category] = r
}

package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type TestLog struct {
	Test          string        `json:"test"`
	Category      string        `json:"category"`
	Passed        bool          `json:"passed"`
	Error         *ErrorDetails `json:"error,omitempty"`
	GraphQLErrors []interface{} `json:"graphql_errors,omitempty"`
}

type ErrorDetails struct {
	Summary          string   `json:"summary"`
	MissingFields    []string `json:"missing_fields"`
	UnexpectedFields []string `json:"unexpected_fields"`
	ValueMismatches  []string `json:"value_mismatches"`
}

type FailureAnalysis struct {
	TotalTests       int
	PassedTests      int
	FailedTests      int
	MissingFields    map[string][]string // field -> list of tests
	UnexpectedFields map[string][]string
	GraphQLErrors    map[string][]string // error message -> list of tests
	CategoryFailures map[string]int
}

func main() {
	// Check if logs directory exists
	logsDir := "test_logs"
	if len(os.Args) > 1 {
		logsDir = os.Args[1]
	}

	files, err := ioutil.ReadDir(logsDir)
	if err != nil {
		fmt.Printf("Error reading logs directory: %v\n", err)
		os.Exit(1)
	}

	analysis := &FailureAnalysis{
		MissingFields:    make(map[string][]string),
		UnexpectedFields: make(map[string][]string),
		GraphQLErrors:    make(map[string][]string),
		CategoryFailures: make(map[string]int),
	}

	// Process each log file
	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		filePath := filepath.Join(logsDir, file.Name())
		data, err := ioutil.ReadFile(filePath)
		if err != nil {
			fmt.Printf("Error reading %s: %v\n", file.Name(), err)
			continue
		}

		var log TestLog
		if err := json.Unmarshal(data, &log); err != nil {
			fmt.Printf("Error parsing %s: %v\n", file.Name(), err)
			continue
		}

		analysis.TotalTests++
		if log.Passed {
			analysis.PassedTests++
		} else {
			analysis.FailedTests++
			analysis.CategoryFailures[log.Category]++

			// Analyze error details
			if log.Error != nil {
				for _, field := range log.Error.MissingFields {
					analysis.MissingFields[field] = append(analysis.MissingFields[field], log.Test)
				}
				for _, field := range log.Error.UnexpectedFields {
					analysis.UnexpectedFields[field] = append(analysis.UnexpectedFields[field], log.Test)
				}
			}

			// Analyze GraphQL errors
			if len(log.GraphQLErrors) > 0 {
				for _, err := range log.GraphQLErrors {
					if errMap, ok := err.(map[string]interface{}); ok {
						if msg, ok := errMap["message"].(string); ok {
							analysis.GraphQLErrors[msg] = append(analysis.GraphQLErrors[msg], log.Test)
						}
					}
				}
			}
		}
	}

	// Generate report
	generateReport(analysis)
}

func generateReport(analysis *FailureAnalysis) {
	fmt.Println("# GraphQL Migration Test Failure Analysis")
	fmt.Println()
	fmt.Printf("## Summary\n")
	fmt.Printf("- Total Tests: %d\n", analysis.TotalTests)
	fmt.Printf("- Passed: %d (%.1f%%)\n", analysis.PassedTests, float64(analysis.PassedTests)/float64(analysis.TotalTests)*100)
	fmt.Printf("- Failed: %d (%.1f%%)\n", analysis.FailedTests, float64(analysis.FailedTests)/float64(analysis.TotalTests)*100)
	fmt.Println()

	// Category breakdown
	if len(analysis.CategoryFailures) > 0 {
		fmt.Println("## Failures by Category")
		categories := make([]string, 0, len(analysis.CategoryFailures))
		for cat := range analysis.CategoryFailures {
			categories = append(categories, cat)
		}
		sort.Strings(categories)
		for _, cat := range categories {
			fmt.Printf("- %s: %d failures\n", cat, analysis.CategoryFailures[cat])
		}
		fmt.Println()
	}

	// GraphQL Errors
	if len(analysis.GraphQLErrors) > 0 {
		fmt.Println("## GraphQL Validation Errors")
		fmt.Println("These tests fail due to GraphQL schema/query issues:")
		fmt.Println()

		errors := make([]string, 0, len(analysis.GraphQLErrors))
		for err := range analysis.GraphQLErrors {
			errors = append(errors, err)
		}
		sort.Strings(errors)

		for _, err := range errors {
			tests := analysis.GraphQLErrors[err]
			fmt.Printf("### %s\n", err)
			fmt.Printf("Affects %d test(s):\n", len(tests))
			for _, test := range tests {
				fmt.Printf("- %s\n", test)
			}
			fmt.Println()
		}
	}

	// Missing fields
	if len(analysis.MissingFields) > 0 {
		fmt.Println("## Missing Fields")
		fmt.Println("These fields are expected but not present in the response:")
		fmt.Println()

		fields := make([]string, 0, len(analysis.MissingFields))
		for field := range analysis.MissingFields {
			fields = append(fields, field)
		}
		sort.Strings(fields)

		// Group by root field
		rootFields := make(map[string][]string)
		for _, field := range fields {
			parts := strings.Split(field, ".")
			root := parts[0]
			if len(parts) > 1 {
				root = parts[1] // Skip "data" prefix
			}
			rootFields[root] = append(rootFields[root], field)
		}

		roots := make([]string, 0, len(rootFields))
		for root := range rootFields {
			roots = append(roots, root)
		}
		sort.Strings(roots)

		for _, root := range roots {
			fmt.Printf("### %s\n", root)
			for _, field := range rootFields[root] {
				tests := analysis.MissingFields[field]
				fmt.Printf("- **%s** (%d tests)\n", field, len(tests))
				if len(tests) <= 3 {
					for _, test := range tests {
						fmt.Printf("  - %s\n", test)
					}
				} else {
					fmt.Printf("  - %s\n", tests[0])
					fmt.Printf("  - %s\n", tests[1])
					fmt.Printf("  - ... and %d more\n", len(tests)-2)
				}
			}
			fmt.Println()
		}
	}

	// Unexpected fields
	if len(analysis.UnexpectedFields) > 0 {
		fmt.Println("## Unexpected Fields")
		fmt.Println("These fields are present but not expected:")
		fmt.Println()

		fields := make([]string, 0, len(analysis.UnexpectedFields))
		for field := range analysis.UnexpectedFields {
			fields = append(fields, field)
		}
		sort.Strings(fields)

		for _, field := range fields {
			tests := analysis.UnexpectedFields[field]
			fmt.Printf("- **%s** (%d tests)\n", field, len(tests))
		}
		fmt.Println()
	}

	// Recommendations
	fmt.Println("## Recommendations")
	fmt.Println()

	if len(analysis.GraphQLErrors) > 0 {
		fmt.Println("1. **Fix GraphQL Schema Issues First**")
		for err := range analysis.GraphQLErrors {
			if strings.Contains(err, "Cannot query field") {
				field := extractFieldFromError(err)
				fmt.Printf("   - Add missing field: %s\n", field)
			}
		}
		fmt.Println()
	}

	if len(analysis.MissingFields) > 0 {
		fmt.Println("2. **Implement Missing Resolvers**")
		fmt.Println("   Priority fields (affecting most tests):")

		// Sort by number of affected tests
		type fieldCount struct {
			field string
			count int
		}
		var fieldCounts []fieldCount
		for field, tests := range analysis.MissingFields {
			fieldCounts = append(fieldCounts, fieldCount{field, len(tests)})
		}
		sort.Slice(fieldCounts, func(i, j int) bool {
			return fieldCounts[i].count > fieldCounts[j].count
		})

		for i, fc := range fieldCounts {
			if i >= 10 {
				break
			}
			fmt.Printf("   - %s (%d tests)\n", fc.field, fc.count)
		}
	}
}

func extractFieldFromError(err string) string {
	// Extract field name from error like: Cannot query field "meta" on type "Query"
	parts := strings.Split(err, "\"")
	if len(parts) >= 2 {
		return parts[1]
	}
	return err
}

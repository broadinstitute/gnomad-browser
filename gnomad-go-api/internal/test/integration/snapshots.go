package integration

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type SnapshotTest struct {
	Name      string
	Query     string
	Variables map[string]interface{}
	Expected  map[string]interface{}
}

// findMigrationTestsDir finds the migration_tests directory relative to the current working directory
func findMigrationTestsDir(baseDir string) (string, error) {
	// Try the provided base directory first
	migrationDir := filepath.Join(baseDir, "migration_tests")
	if _, err := os.Stat(migrationDir); err == nil {
		return migrationDir, nil
	}

	// If not found, try common locations
	locations := []string{
		"../../graphql-api/migration_tests",
		"../../../graphql-api/migration_tests",
		"../../../../graphql-api/migration_tests",
	}

	for _, loc := range locations {
		absPath, err := filepath.Abs(loc)
		if err != nil {
			continue
		}
		if _, err := os.Stat(absPath); err == nil {
			return absPath, nil
		}
	}

	return "", fmt.Errorf("migration_tests directory not found from base: %s", baseDir)
}

// LoadSnapshots loads all snapshot tests from the migration_tests directory
func LoadSnapshots(baseDir string) ([]SnapshotTest, error) {
	var tests []SnapshotTest

	migrationDir, err := findMigrationTestsDir(baseDir)
	if err != nil {
		return nil, err
	}

	snapshotDir := filepath.Join(migrationDir, "snapshots")
	queryDir := filepath.Join(migrationDir, "queries")

	// List all snapshot files
	entries, err := os.ReadDir(snapshotDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read snapshot directory: %w", err)
	}

	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".snapshot.json") {
			continue
		}

		// Derive query and variables file names
		baseName := strings.TrimSuffix(entry.Name(), ".snapshot.json")
		queryFile := filepath.Join(queryDir, baseName+".graphql")
		variablesFile := filepath.Join(queryDir, baseName+".json")
		snapshotFile := filepath.Join(snapshotDir, entry.Name())

		// Load query
		queryBytes, err := os.ReadFile(queryFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read query file %s: %w", queryFile, err)
		}

		// Load variables (optional) - matches TypeScript behavior
		var variables map[string]interface{}
		if _, err := os.Stat(variablesFile); err == nil {
			varBytes, err := os.ReadFile(variablesFile)
			if err != nil {
				return nil, fmt.Errorf("failed to read variables file %s: %w", variablesFile, err)
			}
			if err := json.Unmarshal(varBytes, &variables); err != nil {
				return nil, fmt.Errorf("failed to parse variables file %s: %w", variablesFile, err)
			}
		} else {
			// No variables file, which is fine - use empty map
			variables = make(map[string]interface{})
		}

		// Load expected result
		snapshotBytes, err := os.ReadFile(snapshotFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read snapshot file %s: %w", snapshotFile, err)
		}

		var expected map[string]interface{}
		if err := json.Unmarshal(snapshotBytes, &expected); err != nil {
			return nil, fmt.Errorf("failed to parse snapshot file %s: %w", snapshotFile, err)
		}

		tests = append(tests, SnapshotTest{
			Name:      baseName,
			Query:     string(queryBytes),
			Variables: variables,
			Expected:  expected,
		})
	}

	return tests, nil
}

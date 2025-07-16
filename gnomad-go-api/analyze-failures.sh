#!/bin/bash

# Script to analyze test failures and generate a report

echo "Analyzing test failures..."

# Run the analyzer
go run analyze-test-failures.go "$@" > failure-analysis.md

if [ $? -eq 0 ]; then
    echo "✓ Analysis complete!"
    echo "  Report saved to: failure-analysis.md"
    echo ""
    echo "Quick preview:"
    echo "=============="
    head -30 failure-analysis.md
    echo ""
    echo "... (see failure-analysis.md for full report)"
else
    echo "✗ Analysis failed"
    exit 1
fi
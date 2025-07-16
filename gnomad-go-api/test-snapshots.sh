#!/bin/bash

# Script to run snapshot integration tests with helpful options

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
TEST_FILTER=""
SHOW_LOGS=false
VERBOSE=false

# Usage function
usage() {
    echo "Usage: $0 [options] [test-name]"
    echo ""
    echo "Options:"
    echo "  -h, --help      Show this help message"
    echo "  -l, --logs      Show log file location after test"
    echo "  -v, --verbose   Show verbose test output"
    echo "  -a, --all       Run all tests (default if no test name provided)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all snapshot tests"
    echo "  $0 variant-page-v4           # Run specific test"
    echo "  $0 -l variant-page-v4        # Run test and show log location"
    echo "  $0 -v copy-number            # Run all tests matching 'copy-number' with verbose output"
    echo ""
    echo "Available test categories:"
    echo "  - variant-page-*             (Variant page tests)"
    echo "  - gene-page-*                (Gene page tests)"
    echo "  - copy-number-variant-*      (Copy number variant tests)"
    echo "  - structural-variant-*       (Structural variant tests)"
    echo "  - short-tandem-repeat-*      (STR tests)"
    echo "  - region-*                   (Region tests)"
    echo "  - transcript-*               (Transcript tests)"
    echo ""
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -a|--all)
            TEST_FILTER=""
            shift
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
        *)
            TEST_FILTER="$1"
            shift
            ;;
    esac
done

# Build the test command
if [ -z "$TEST_FILTER" ]; then
    echo -e "${GREEN}Running all snapshot integration tests...${NC}"
    TEST_CMD="go test ./internal/test/integration/... -run TestVariantQueriesAgainstSnapshots"
else
    echo -e "${GREEN}Running tests matching: ${YELLOW}$TEST_FILTER${NC}"
    TEST_CMD="go test ./internal/test/integration/... -run TestVariantQueriesAgainstSnapshots/$TEST_FILTER"
fi

if [ "$VERBOSE" = true ]; then
    TEST_CMD="$TEST_CMD -v"
fi

# Run the tests
echo -e "${YELLOW}Executing: $TEST_CMD${NC}"
echo ""

# Save start time
START_TIME=$(date +%s)

# Run tests and capture exit code
if $TEST_CMD; then
    EXIT_CODE=0
    echo -e "\n${GREEN}✓ Tests completed successfully${NC}"
else
    EXIT_CODE=$?
    echo -e "\n${RED}✗ Tests failed${NC}"
fi

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo -e "\nTest duration: ${DURATION}s"

# Show log locations if requested
if [ "$SHOW_LOGS" = true ]; then
    echo -e "\n${YELLOW}Test outputs:${NC}"
    
    # Find test_logs directory
    if [ -d "test_logs" ]; then
        LOGS_DIR=$(pwd)/test_logs
        echo -e "  Log directory: ${GREEN}$LOGS_DIR${NC}"
        
        if [ -n "$TEST_FILTER" ]; then
            # Show specific log file if test filter was used
            LOG_FILES=$(find test_logs -name "*${TEST_FILTER}*.log" 2>/dev/null)
            if [ -n "$LOG_FILES" ]; then
                echo -e "  Matching log files:"
                for log in $LOG_FILES; do
                    echo -e "    - ${GREEN}$(pwd)/$log${NC}"
                done
            fi
        else
            # Show log count for all tests
            LOG_COUNT=$(find test_logs -name "*.log" | wc -l)
            echo -e "  Total log files: ${LOG_COUNT}"
        fi
    fi
    
    # Show summary file location
    if [ -f "test_summary.txt" ]; then
        echo -e "  Summary file: ${GREEN}$(pwd)/test_summary.txt${NC}"
    fi
fi

# Quick summary from test_summary.txt if it exists
if [ -f "test_summary.txt" ] && [ "$VERBOSE" = false ]; then
    echo -e "\n${YELLOW}Quick Summary:${NC}"
    grep -E "Overall:|Failed tests:" test_summary.txt | head -20
fi

# Suggest running analyzer if tests failed
if [ $EXIT_CODE -ne 0 ] && [ -d "test_logs" ]; then
    echo -e "\n${YELLOW}💡 Tip:${NC} Run ${GREEN}./analyze-failures.sh${NC} to generate a detailed failure analysis report"
fi

exit $EXIT_CODE
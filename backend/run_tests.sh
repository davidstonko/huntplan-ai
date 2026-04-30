#!/bin/bash
# Quick test runner script for MDHuntFishOutdoors backend

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}MDHuntFishOutdoors Backend Test Suite${NC}"
echo "========================================"

# Check if venv is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo -e "${YELLOW}Virtual environment not activated. Attempting to activate...${NC}"
    if [ -d "venv" ]; then
        source venv/bin/activate
        echo -e "${GREEN}Activated venv${NC}"
    else
        echo -e "${RED}No venv directory found. Please create and activate a virtual environment.${NC}"
        exit 1
    fi
fi

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}pytest not found. Installing test dependencies...${NC}"
    pip install -r requirements.txt
fi

# Parse arguments
TEST_ARGS=""
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Running all tests...${NC}"
    TEST_ARGS="tests/"
else
    echo -e "${YELLOW}Running: pytest $@${NC}"
    TEST_ARGS="$@"
fi

# Run tests with pytest
echo ""
pytest $TEST_ARGS -v --tb=short

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    exit 1
fi

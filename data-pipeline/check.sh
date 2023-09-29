#!/usr/bin/env bash
#
echo "┏━━━ Clean ━━━━━━━━━━━━━━━━━━━"
find . -type d -name "__pycache__" -exec rm -r {} +
find . -name "*.pyc" -exec rm -f {} +

echo "┏━━━ Running pyright ━━━━━━━━━━━━━━━━━━━"
pyright

echo "┏━━━ Running black ━━━━━━━━━━━━━━━━━━━"
black src/data_pipeline
black tests

echo "┏━━━ Running ruff ━━━━━━━━━━━━━━━━━━━"
ruff src/data_pipeline --fix
ruff tests --fix

echo "┏━━━ Running pytest ━━━━━━━━━━━━━━━━━━━"
if [[ "$1" == "--mock-data" ]]; then
	pytest -k "mock_data"
else
	pytest
fi

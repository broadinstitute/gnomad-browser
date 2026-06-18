#!/usr/bin/env bash
#
echo "┏━━━ Clean ━━━━━━━━━━━━━━━━━━━"
find . -type d -name "__pycache__" -exec rm -r {} +
find . -name "*.pyc" -exec rm -f {} +

echo "┏━━━ Running pyright ━━━━━━━━━━━━━━━━━━━"
pyright

echo "┏━━━ Running ruff format ━━━━━━━━━━━━━━━━━━━"
ruff format src/data_pipeline
ruff format tests
ruff format caids

echo "┏━━━ Running ruff ━━━━━━━━━━━━━━━━━━━"
ruff check src/data_pipeline --fix
ruff check tests --fix
ruff check caids --fix

echo "┏━━━ Running pytest ━━━━━━━━━━━━━━━━━━━"
if [[ "$1" == "--mock-data" ]]; then
	pytest -k "mock_data"
else
	pytest
fi

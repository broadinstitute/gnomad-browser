#!/usr/bin/env bash
#
echo "┏━━━ Clean ━━━━━━━━━━━━━━━━━━━"
find . -type d -name "__pycache__" -exec rm -r {} +
find . -name "*.pyc" -exec rm -f {} +

echo "┏━━━ Syncing dependencies (uv) ━━━━━━━━━━━━━━━━━━━"
uv sync

echo "┏━━━ Running pyright ━━━━━━━━━━━━━━━━━━━"
uv run pyright

echo "┏━━━ Running ruff format ━━━━━━━━━━━━━━━━━━━"
uv run ruff format src/data_pipeline
uv run ruff format tests

echo "┏━━━ Running ruff ━━━━━━━━━━━━━━━━━━━"
uv run ruff check src/data_pipeline --fix
uv run ruff check tests --fix

echo "┏━━━ Running pytest ━━━━━━━━━━━━━━━━━━━"
if [[ "$1" == "--mock-data" ]]; then
	uv run pytest -k "mock_data"
else
	uv run pytest
fi

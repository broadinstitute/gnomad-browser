#!/usr/bin/env bash
#
echo "┏━━━ Clean ━━━━━━━━━━━━━━━━━━━"
find . -type d -name "__pycache__" -exec rm -r {} +
find . -name "*.pyc" -exec rm -f {} +

echo "┏━━━ Syncing dependencies ━━━━━━━━━━━━━━━━━━━"
# Install the exact dependencies from uv.lock into .venv without re-resolving or
# updating the lockfile. Errors out if pyproject.toml has drifted from uv.lock.
uv sync --frozen --project ..

echo "┏━━━ Running pyright ━━━━━━━━━━━━━━━━━━━"
uv run --project .. pyright

echo "┏━━━ Running ruff format ━━━━━━━━━━━━━━━━━━━"
uv run --project .. ruff format src/data_pipeline
uv run --project .. ruff format caids

echo "┏━━━ Running ruff ━━━━━━━━━━━━━━━━━━━"
uv run --project .. ruff check src/data_pipeline --fix
uv run --project .. ruff check caids --fix

echo "┏━━━ Running pytest ━━━━━━━━━━━━━━━━━━━"
if [[ "$1" == "--mock-data" ]]; then
	uv run --project .. pytest -k "mock_data"
else
	uv run --project .. pytest
fi

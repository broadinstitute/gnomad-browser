#!/usr/bin/env bash
#
echo "┏━━━ Clean ━━━━━━━━━━━━━━━━━━━"
find . -type d -name "__pycache__" -exec rm -r {} +
find . -name "*.pyc" -exec rm -f {} +

echo "┏━━━ Syncing dependencies ━━━━━━━━━━━━━━━━━━━"
# Install the exact dependencies from uv.lock into .venv without re-resolving or
# updating the lockfile. Errors out if pyproject.toml has drifted from uv.lock.
uv sync --frozen

echo "┏━━━ Running pyright ━━━━━━━━━━━━━━━━━━━"
uv run pyright

echo "┏━━━ Running ruff format ━━━━━━━━━━━━━━━━━━━"
uv run ruff format src/data_pipeline
uv run ruff format tests
uv run ruff format caids

echo "┏━━━ Running ruff ━━━━━━━━━━━━━━━━━━━"
uv run ruff check src/data_pipeline --fix
uv run ruff check tests --fix
uv run ruff check caids --fix

echo "┏━━━ Running pytest ━━━━━━━━━━━━━━━━━━━"
if [[ "$1" == "--mock-data" ]]; then
	uv run pytest -k "mock_data"
else
	uv run pytest
fi

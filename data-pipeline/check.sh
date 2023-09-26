#!/usr/bin/env bash

echo "┏━━━ Running pyright ━━━━━━━━━━━━━━━━━━━"
pyright

echo "┏━━━ Running black ━━━━━━━━━━━━━━━━━━━"
black src/data_pipeline
black tests

echo "┏━━━ Running ruff ━━━━━━━━━━━━━━━━━━━"
ruff src/data_pipeline
ruff tests --fix

echo "┏━━━ Running pytest ━━━━━━━━━━━━━━━━━━━"
pytest -m only

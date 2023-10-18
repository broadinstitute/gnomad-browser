#!/usr/bin/env bash
#
poetry export --without-hashes --with dev >requirements.txt

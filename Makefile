.PHONY: install-js-dependencies intall-py-all-dependencies install-py-data-pipeline-dependencies install-py-deploy-dependencies \
        check-format-browser lint-js-browser lint-css-browser typecheck-browser test-browser build-browser \
		validate-browser fix-browser \
	check-format-graphql-api  lint-js-graphql-api typecheck-graphql-api test-graphql-api \
		validate-graphql-api fix-graphql-api \
	check-format-data-pipeline lint-data-pipeline typecheck-data-pipeline test-data-pipeline \
		validate-data-pipeline fix-data-pipeline \
        check-format-deploy lint-deploy \
		validate-deploy fix-deploy \
	check-format-data-store lint-data-store test-data-store \
		build-native-data-store check-types-data-store test-node-data-store \
		validate-data-store fix-data-store \
		validate-all

# Dependencies
# ===
install-js-dependencies:
	pnpm install --frozen-lockfile

install-py-all-dependencies:
	uv sync --frozen --group dev

install-py-data-pipeline-dependencies:
	uv sync --frozen

install-py-deploy-dependencies:
	uv sync --frozen

# Frontend
# ===
check-format-browser:
	pnpm prettier --check "browser/**/*.{js,jsx,ts,tsx,json,md}" --ignore-path .gitignore

lint-js-browser:
	pnpm eslint browser

lint-css-browser:
	pnpm stylelint 'browser/**/*.(js|jsx|ts|tsx)'

typecheck-browser:
	pnpm ts-node ./browser/build/buildHelp.ts && pnpm typecheck

test-browser:
	pnpm jest --selectProjects browser

build-browser:
	cd browser && pnpm build

validate-browser: check-format-browser lint-js-browser lint-css-browser typecheck-browser test-browser build-browser

fix-browser:
	pnpm prettier --write "browser/**/*.{js,jsx,ts,tsx,json,md}" --ignore-path .gitignore
	pnpm eslint browser --fix
	pnpm stylelint 'browser/**/*.(js|jsx|ts|tsx)'
	pnpm jest --selectProjects browser -u

# API
# ===
check-format-graphql-api:
	pnpm prettier --check "graphql-api/**/*.{js,jsx,ts,tsx,json,md}"

lint-js-graphql-api:
	pnpm eslint graphql-api

typecheck-graphql-api:
	pnpm ts-node ./browser/build/buildHelp.ts && pnpm typecheck

test-graphql-api:
	pnpm jest --selectProjects graphql-api

validate-graphql-api: check-format-graphql-api lint-js-graphql-api typecheck-graphql-api test-graphql-api

fix-graphql-api:
	pnpm prettier --write "graphql-api/**/*.{js,jsx,ts,tsx,json,md}"
	pnpm eslint graphql-api --fix

# Data pipeline, Reads
# ===
check-format-data-pipeline:
	uv run ruff format --check data-pipeline/src/data_pipeline data-pipeline/tests data-pipeline/caids reads development/scripts

lint-data-pipeline:
	uv run ruff check data-pipeline/src/data_pipeline data-pipeline/tests data-pipeline/caids reads development/scripts

typecheck-data-pipeline:
	uv run pyright --project data-pipeline

test-data-pipeline:
	uv run pytest data-pipeline

validate-data-pipeline: check-format-data-pipeline lint-data-pipeline typecheck-data-pipeline test-data-pipeline

fix-data-pipeline:
	uv run ruff format data-pipeline/src/data_pipeline data-pipeline/caids reads
	uv run ruff check --fix data-pipeline/src/data_pipeline data-pipeline/caids reads

# Deploy scripts
# ===
check-format-deploy:
	uv run ruff format --check deploy/deployctl

lint-deploy:
	uv run ruff check deploy/deployctl

validate-deploy: check-format-deploy lint-deploy

fix-deploy:
	uv run ruff format deploy/deployctl
	uv run ruff check --fix deploy/deployctl

# Data store
# ===
check-format-data-store:
	cd data-store && cargo fmt --all -- --check

lint-data-store:
	cd data-store && cargo clippy --locked --all-targets -- -D warnings

test-data-store:
	cd data-store && cargo test --locked

build-native-data-store:
	cd data-store && pnpm build:native

check-types-data-store: build-native-data-store
	git diff --exit-code -- data-store/index.d.ts

test-node-data-store: build-native-data-store
	cd data-store && pnpm test:node

validate-data-store: check-format-data-store lint-data-store test-data-store \
	check-types-data-store test-node-data-store

fix-data-store:
	cd data-store && cargo fmt --all
	cd data-store && cargo clippy --locked --all-targets --fix --allow-dirty -- -D warnings
	cd data-store && pnpm build:native

# ===
validate-all: validate-browser validate-graphql-api validate-data-pipeline validate-deploy validate-data-store

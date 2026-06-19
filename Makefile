.PHONY: install-js-dependencies install-py-data-pipeline-dependencies install-py-deploy-dependencies \
        check-format-browser lint-js-browser lint-css-browser typecheck-browser test-browser build-browser \
        validate-browser fix-browser \
		check-format-graphql-api  lint-js-graphql-api typecheck-graphql-api test-graphql-api \
        validate-graphql-api fix-graphql-api \
		check-format-data-pipeline lint-data-pipeline typecheck-data-pipeline \
		validate-data-pipeline fix-data-pipeline \
        check-format-deploy lint-deploy \
		validate-deploy fix-deploy \
		validate-all

# Dependencies
# ===
install-js-dependencies:
	pnpm install --frozen-lockfile

install-py-data-pipeline-dependencies:
	pip install wheel
	pip install -r requirements-dev.txt
	pip install -r data-pipeline/requirements.txt

install-py-deploy-dependencies:
	pip install wheel
	pip install -r requirements-dev.txt
	pip install -r deploy/deployctl/requirements.txt

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
	ruff format --check data-pipeline/src/data_pipeline data-pipeline/tests data-pipeline/caids reads development/scripts

lint-data-pipeline:
	ruff check data-pipeline/src/data_pipeline data-pipeline/tests data-pipeline/caids reads development/scripts

typecheck-data-pipeline:
	pyright --project data-pipeline

validate-data-pipeline: check-format-data-pipeline lint-data-pipeline typecheck-data-pipeline

fix-data-pipeline:
	ruff format data-pipeline/src/data_pipeline data-pipeline/caids reads
	ruff check --fix data-pipeline/src/data_pipeline data-pipeline/caids reads

# Deploy scripts
# ===
check-format-deploy:
	ruff format --check deploy/deployctl

lint-deploy:
	ruff check deploy/deployctl
	pylint --disable=fixme deploy/deployctl

validate-deploy: check-format-deploy lint-deploy

fix-deploy:
	ruff format deploy/deployctl
	ruff check --fix deploy/deployctl

# ===
validate-all: validate-browser validate-graphql-api validate-data-pipeline validate-deploy

SERVER_DIR ?= ./node_modules/@broad/dev-server
BIN_DIR ?= $(SERVER_DIR)/node_modules/.bin
BUILD_DIR ?= build
SRC ?= index.js

BUILD_FLAGS ?=
SERVER_ENV ?= NODE_ENV=development
SERVER_FLAGS ?= --hot --config webpack.config.js
WATCH_FLAGS ?= example/index.js -p browserify-hmr -o example/bundle.js -dv

P="\\033[34m[+]\\033[0m"

help:
	@echo
	@echo "  \033[34mbuild\033[0m – builds the component"
	@echo "  \033[34mstart\033[0m – start dev server on :8010 with hot module replacement"
	@echo

build: export NODE_ENV = production
build:
	@echo "  $(P) build"
	@$(BIN_DIR)/babel $(BUILD_FLAGS) -d $(BUILD_DIR) $(SRC)

start:
	@$(MAKE) serve & $(MAKE) watch

watch:
	@echo "  $(P) watch $(WATCH_FLAGS)"
	@$(BIN_DIR)/watch $(WATCH_FLAGS)

serve:
	@echo "  $(P) serve $(SERVER_FLAGS)" ; \
	lsof -ti:8010 | xargs kill ; \
	pwd; \
	cd $(SERVER_DIR) ; \
	pwd; \
	ls; \
	$(SERVER_ENV) ./node_modules/.bin/webpack-dev-server $(SERVER_FLAGS)

.PHONY: build start watch serve help

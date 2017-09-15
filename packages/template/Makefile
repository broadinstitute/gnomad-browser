BINDIR=../../node_modules/.bin
SERVER_FLAGS ?= --hot --config ../../webpack.config.js

install:
	yarn install

lib:
	NODE_ENV=production \
	BABEL_ENV=es \
	$(BINDIR)/babel src \
	--out-dir lib ; \
	echo "✓ Compiled Babel to lib" ;

clean:
	rm -rf node_modules lib

build: clean install lib

serve:
	@echo "  $(P) serve $(SERVER_FLAGS)" ; \
	lsof -ti:8008| xargs kill ; \
	cd ../dev-server ; \
	pwd; \
	ls; \
	$(BINDIR)/webpack-dev-server $(SERVER_FLAGS)

.PHONY: install lib clean build serve

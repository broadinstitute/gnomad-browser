BINDIR=../../node_modules/.bin
SERVER_FLAGS ?= --port 8010 --hot --config ../../webpack.config.js

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
	GNOMAD_API_URL=http://localhost:8007 $(BINDIR)/webpack-dev-server $(SERVER_FLAGS)

COMPONENT_NAME=$(shell basename `pwd`)

.PHONY: install lib clean build serve prototype

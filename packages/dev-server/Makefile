BINDIR=../../node_modules/.bin
SERVER_FLAGS ?= --hot --port 8000 --config ../../webpack.config.js

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
	cd ../dev-server ; \
	NODE_ENV=development $(BINDIR)/webpack-dev-server $(SERVER_FLAGS)

COMPONENT_NAME=$(shell basename `pwd`)

prototype:
	@echo "import Example from '@broad/$(COMPONENT_NAME)/src/example'; export default Example" > ../dev-server/src/current.js ; \
	make serve

.PHONY: install lib clean build serve prototype

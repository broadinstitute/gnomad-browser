lib:
	NODE_ENV=production \
	BABEL_ENV=es \
	../../node_modules/.bin/babel src \
	--out-dir lib ; \
	echo "✓ Compiled Babel to lib" ;

clean:
	rm -rf node_modules lib

build: clean lib

serve:
	cd ../dev-server ; \
	NODE_ENV=development ../../node_modules/.bin/webpack-dev-server --hot --port 8000

COMPONENT_NAME=$(shell basename `pwd`)

prototype:
	@echo "import Example from '@broad/$(COMPONENT_NAME)/src/example'; export default Example" > ../dev-server/src/current.js ; \
	make serve

.PHONY: lib clean build serve prototype

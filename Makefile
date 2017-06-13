.PHONY: lint lib

BINDIR=node_modules/.bin

ARG=$(filter-out $@,$(MAKECMDGOALS))

help:
	@echo "Available commands:"
	@echo ""
	@echo "  make setup\t\t\tyarn install everything"
	@echo ""

setup:
	@echo "Cleaning..."
	make clean
	@echo "yarn install in the root folder"
	@yarn install
	@echo "yarn install all packages"
	.scripts/x-for-all-packages.sh yarn
	@echo "Compiling package libraries"
	make lib all
	@echo "Linking development server"
	.scripts/link-dev-server.sh
	@echo ""

clean:
	rm -rf node_modules
	.scripts/x-for-all-packages.sh rm -rf node_modules lib

watch:
	@if [ "$(ARG)" = "" ]; then \
		echo "Please use 'make watch <package>"; \
	else \
		cd packages/lens-dev-server; \
		echo "> Cleaning development server";\
		rm -rf ./node_modules/lens-test; \
		mkdir ./node_modules/lens-test; \
		echo "> Copying local dependency $(ARG) to node_modules"; \
		cp -r ../$(ARG)/* ./node_modules/lens-test; \
		cd ../../; \
		echo ""; \
		echo "Done copying, watching $(ARG) for changes"; \
		$(BINDIR)/watch --interval=1 \
		"echo 'Recompiling';make lib $(ARG); \
		 .scripts/link-dev-server-faster.sh $(ARG)" \
		 packages/$(ARG)/src ; \
	fi

lib:
	@if [ "$(ARG)" = "all" ]; then \
		.scripts/x-for-all-packages.sh rm -rf lib; \
		while read d ; do \
			echo "Compiling $$d" ; \
			make lib $$d ; \
		done < .scripts/RELEASABLE_PACKAGES; \
	elif [ "$(ARG)" = "" ]; then \
		echo "Please call 'make lib' with all or name of package as argument"; \
	else \
		NODE_ENV=production \
		BABEL_ENV=es \
		$(BINDIR)/babel packages/$(ARG)/src \
		--out-dir packages/$(ARG)/lib \
		--copy-files ;\
		echo "✓ Compiled Babel to lib" ;\
	fi

%:
	@:
.DEFAULT :
	@:

.PHONY: lint lib

BINDIR=node_modules/.bin

ARG=$(filter-out $@,$(MAKECMDGOALS))

help:
	@echo "Available commands:"
	@echo ""
	@echo "  make setup\t\t\tyarn install everything"
	@echo ""

setup:
	@echo "yarn install"
	@yarn install
	@echo ""
	@while read d ; do \
		echo "$$d: yarn install" ;\
		cd $$d ; yarn install ; cd .. ;\
		echo "" ;\
	done < .scripts/RELEASABLE_PACKAGES

link-all:
	.scripts/yarn-link-packages.sh

clean:
	@while read d ; do \
		echo "$$d: Cleaning lib" ;\
		rm -rf packages/$$d/lib/ ;\
		mkdir -p packages/$$d/lib ;
	done < .scripts/RELEASABLE_PACKAGES

watch:
	@if [ "$(ARG)" = "" ]; then \
		echo "Please use 'make watch <package>"; \
	else \
		$(BINDIR)/watch "make lib $(ARG)" packages/$(ARG)/src ; \
	fi

lib:
	@if [ "$(ARG)" = "all" ]; then \
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

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

something:
	@echo "$(ARG)"
	@ls $(ARG)

lib:
	@if [ "$(ARG)" = "all" ]; then \
		while read d ; do \
			echo "Compiling $$d" ; \
			make lib $$d ; \
		done < .scripts/RELEASABLE_PACKAGES; \
	elif [ "$(ARG)" = "" ]; then \
		echo "Please call 'make lib' with all or name of package as argument"; \
	else \
		rm -rf $(ARG)/lib/ ;\
		mkdir -p $(ARG)/lib ;\
		NODE_ENV=production \
		BABEL_ENV=es \
		$(BINDIR)/babel $(ARG)/src \
		--out-dir $(ARG)/lib \
		--copy-files ;\
		echo "✓ Compiled Babel to lib" ;\
	fi

%:
	@:
.DEFAULT :
	@:
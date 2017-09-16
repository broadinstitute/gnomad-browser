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
	@echo "yarn install all packages/projects"
	.scripts/x-for-all-packages.sh yarn
	.scripts/x-for-all-projects.sh yarn
	@echo "Compiling package libraries"
	make lib all
	@echo "Linking development server"
	.scripts/link-dev-server.sh
	@echo ""

clean:
	rm -rf node_modules
	.scripts/x-for-all-packages.sh rm -rf node_modules lib
	.scripts/x-for-all-projects.sh rm -rf node_modules lib

dev:
	@echo "Compiling package libraries"
	make lib all
	@echo "Updating development server"
	.scripts/link-dev-server.sh
	@echo ""

watch:
	@if [ "$(ARG)" = "" ]; then \
		echo "Please use 'make watch <package>"; \
	else \
		cd packages/@broad/dev-server; \
		echo "> Cleaning development server";\
		rm -rf ./node_modules/@broad/test; \
		mkdir ./node_modules/@broad/test; \
		echo "> Copying local dependency $(ARG) to node_modules"; \
		cp -r ../$(ARG)/* ./node_modules/@broad/test; \
		cd ../../; \
		echo ""; \
		echo "Done copying, watching $(ARG) for changes"; \
		$(BINDIR)/watch --interval=1 \
		"echo 'Recompiling';make lib $(ARG); \
		 .scripts/link-dev-server-faster.sh $(ARG)" \
		 packages/$(ARG)/src ; \
	fi

watch-dep:
	@if [ "$(ARG)" = "" ]; then \
		echo "Please use 'make watch <package>"; \
	else \
		cd packages/@broad/dev-server; \
		echo "> Cleaning development server";\
		rm -rf ./node_modules/$(ARG)/; \
		mkdir ./node_modules/$(ARG); \
		echo "> Copying local dependency $(ARG) to node_modules"; \
		cp -r ../$(ARG)/* ./node_modules/$(ARG); \
		cd ../../; \
		echo ""; \
		echo "Done copying, watching $(ARG) for changes"; \
		$(BINDIR)/watch --interval=1 \
		"echo 'Recompiling';make lib $(ARG); \
		 .scripts/copy-dep-dev-server.sh $(ARG)" \
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

context:
	make -C cluster context

load-and-persist: load-data persist-data

load-data:
	make -C cluster cluster
	make -C cluster elasticsearch
	make -C cluster dataproc-no-vep
	make -C packages/schizophrenia/data variants
	make -C packages/gnomad/data all

persist-data:
	make -C cluster/elasticsearch create-persistent-nodes
	make -C cluster/elasticsearch deploy-persistent-data-pods
	make -C cluster/elasticsearch reallocate-shards
	make takedown-loading-nodes

takedown-loading-nodes:
	make -C cluster delete-dataproc-cluster
	make -C cluster/elasticsearch delete-loading-data-pods
	make -C cluster/elasticsearch delete-load-nodes

start-persistent-cluster:
	make -C cluster cluster
	make -C cluster context
	make -C cluster/elasticsearch persistent

start-dev:
	make -C cluster cluster
	make -C cluster context
	make -C cluster/elasticsearch dev

delete-data-cluster:
	make -C cluster delete-elasticsearch-cluster & \
	make -C cluster delete-dataproc-cluster

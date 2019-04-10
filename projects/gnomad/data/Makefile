#!make

include ../../../cluster/config.sh

coverage-exacv1:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_exacv1_coverage.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 20000 \
	--num-shards 6 \
	--index exacv1_coverage

regional-constraint-gene-stats:
	../../../node_modules/.bin/babel-node --config-file=../../../babel.config.js export_regional_constraint_gene_stats.js

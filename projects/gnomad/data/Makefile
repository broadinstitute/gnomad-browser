#!make

include ../../../cluster/config.sh

all: variants-gnomad coverage-exome coverage-genome

test: variants-dmd coverage-test

variants:
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../../hail-db-utils/export_gnomad_to_ES.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 200 \
	--genome_version 37 \
	--index $(VARIANTS_INDEX_NAME) \
	--index-type variant \
	--exomes-vds $(EXOMES_VDS_PATH) \
	--genomes-vds $(GENOMES_VDS_PATH) \
	--num-shards 12

variants-gnomad:
	@make \
	EXOMES_VDS_PATH=gs://gnomad-public/release/2.0.2/vds/exomes/gnomad.exomes.r2.0.2.sites.split.vds \
	GENOMES_VDS_PATH=gs://gnomad-public/release/2.0.2/vds/genomes/gnomad.genomes.r2.0.2.sites.split.vds \
	VARIANTS_INDEX_NAME=gnomad \
	variants

variants-22:
	@make \
	EXOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.exomes.r2.0.1.vep.sites_37_chr22_subset.vds \
	GENOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.genomes.r2.0.1.vep.sites_37_chr22_subset.vds \
	VARIANTS_INDEX_NAME=gnomad_chromosome_22 \
	variants

variants-dmd:
	@make \
	EXOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.exomes.r2.0.2.sites.split.dmd.vds \
	GENOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.genomes.r2.0.2.sites.split.dmd.vds \
	VARIANTS_INDEX_NAME=dmd \
	variants

variants-dmd-old:
	@make \
	EXOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.exomes.r2.0.1.vep.sites_37_DMD_subset.vds \
	GENOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.genomes.r2.0.1.vep.sites_37_DMD_subset.vds \
	VARIANTS_INDEX_NAME=dmd \
	variants

coverage:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_coverage.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 20000 \
	--num-shards 6 \
	--index $(COVERAGE_INDEX_NAME) \
	--coverage-type $(COVERAGE_TYPE)

coverage-genome:
	@make \
	COVERAGE_INDEX_NAME=genome_coverage \
	COVERAGE_TYPE=genome \
	coverage

coverage-exome:
	@make \
	COVERAGE_INDEX_NAME=exome_coverage \
	COVERAGE_TYPE=exome \
	coverage

coverage-test:
	@make \
	COVERAGE_INDEX_NAME=chrom_x_coverage \
	COVERAGE_TYPE=test \
	coverage

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


persist:
	curl -XPUT http://$(ES_IP)/dmd,chrom_x_coverage/_settings -d '{ \
		"index.routing.allocation.include.data_node_hostname": "es-data-persistent*", \
		"index.routing.allocation.exclude.data_node_hostname": "es-data-loading*" \
	}'

genome-parts:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_genomes_as_parts.py

regional-constraint-gene-stats:
	../../../node_modules/.bin/babel-node export_regional_constraint_gene_stats.js

regional-constraint-regional-missense:
	../../../node_modules/.bin/babel-node export_regional_constraint_regional_missense.js

dataproc-exacv1:
	../../../hail-db-utils/create_cluster.GRCh37.py \
	--project $(GCLOUD_PROJECT) \
	--zone $(GCLOUD_ZONE) \
	--machine-type n1-standard-4 \
	--num-workers 10

vep-annotate-exacv1:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster vep-grch37 \
	../../../hail-db-utils/run_vep.py \
	gs://gnomad-browser/datasets/ExAC.r1.sites.vds \
	gs://gnomad-browser/datasets/ExAC.r1.sites.vep.vds

variants-exac:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_exacv1_to_ES.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 200 \
	--genome_version 37 \
	--index exacv1 \
	--index-type variant \
	--exacv1-vds gs://gnomad-browser/datasets/ExAC.r1.sites.vep.vds \
	--num-shards 5

create-subset-vds:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	create_gnomad_subsets_by_interval.py \
	--exomes-vds $(EXOMES_VDS_PATH) \
	--genomes-vds $(GENOMES_VDS_PATH) \
	--exomes-vds-out $(EXOMES_VDS_PATH_OUT) \
	--genomes-vds-out $(GENOMES_VDS_PATH_OUT) \
	--interval $(INTERVAL)

create-subset-dmd:
	@make \
	EXOMES_VDS_PATH=gs://gnomad-public/release/2.0.2/vds/exomes/gnomad.exomes.r2.0.2.sites.split.vds \
	GENOMES_VDS_PATH=gs://gnomad-public/release/2.0.2/vds/genomes/gnomad.genomes.r2.0.2.sites.split.vds \
	EXOMES_VDS_PATH_OUT=gs://gnomad-browser/datasets/gnomad.exomes.r2.0.2.sites.split.dmd.vds \
	GENOMES_VDS_PATH_OUT=gs://gnomad-browser/datasets/gnomad.genomes.r2.0.2.sites.split.dmd.vds \
	INTERVAL="X:31115795-33357559" \
	create-subset-vds

annotate-gnomad:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../../hail-db-utils/add_annotations.py \
	--genome-version 37 \
	--exclude-dbnsfp \
	--exclude-1kg \
	--exclude-gnomad \
	--exclude-exac \
	gs://gnomad-browser/datasets/gnomad.exomes.r2.0.2.sites.split.dmd.vds \
	gs://gnomad-browser/datasets/gnomad.exomes.r2.0.2.sites.split.dmd.annotated.vds

variants-new:
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	./export_gnomad_to_ES.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 200 \
	--genome_version 37 \
	--index $(VARIANTS_INDEX_NAME) \
	--index-type variant \
	--vds $(VDS_PATH) \
	--num-shards 12

variants-dmd-exomes:
	@make \
	VDS_PATH=gs://gnomad-browser/datasets/gnomad.exomes.r2.0.2.sites.split.dmd.vds \
	VARIANTS_INDEX_NAME=gnomad_exomes \
	variants-new

variants-dmd-genomes:
	@make \
	VDS_PATH=gs://gnomad-browser/datasets/gnomad.genomes.r2.0.2.sites.split.dmd.vds \
	VARIANTS_INDEX_NAME=gnomad_genomes \
	variants-new

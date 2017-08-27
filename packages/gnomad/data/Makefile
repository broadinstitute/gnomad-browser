#!make

include ../../cluster/config.sh

variants:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_gnomad_to_ES.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 200 \
	--genome_version 37 \
	--index $(VARIANTS_INDEX_NAME) \
	--index-type variant \
	--exomes-vds $(EXOMES_VDS_PATH) \
	--genomes-vds $(GENOMES_VDS_PATH) \
	--num-shards 1

variants-gnomad:
	@make \
	EXOME_VDS_PATH=gs://gnomad-public/release-170228/gnomad.exomes.r2.0.1.sites.vds \
	GENOMES_VDS_PATH=gs://gnomad-public/release-170228/gnomad.genomes.r2.0.1.sites.vds \
	VARIANTS_INDEX_NAME=gnomad \
	variants

variants-22:
	@make \
	EXOME_VDS_PATH=gs://gnomad-browser/datasets/gnomad.exomes.r2.0.1.vep.sites_37_chr22_subset.vds \
	GENOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.genomes.r2.0.1.vep.sites_37_chr22_subset.vds \
	VARIANTS_INDEX_NAME=gnomad_chromosome_22 \
	variants

variants-dmd:
	@make \
	EXOME_VDS_PATH=gs://gnomad-browser/datasets/gnomad.exomes.r2.0.1.vep.sites_37_dmd_subset.vds \
	GENOMES_VDS_PATH=gs://gnomad-browser/datasets/gnomad.genomes.r2.0.1.vep.sites_37_dmd_subset.vds \
	VARIANTS_INDEX_NAME=dmd \
	variants

coverage:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_coverage.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 20000 \
	--num-shards 1 \
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



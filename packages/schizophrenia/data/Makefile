#!make

include ../../cluster/config.sh

vds:
	../../hail-db-utils/submit.py \
	./convert_vcf_to_vds.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	--output-path gs://gnomad-browser/datasets/sczmeta.counts.vds \
	gs://tsingh/tmp/REL_2016_09_20/sczmeta.counts.vcf.gz

# requires vep-grch37 dataproc cluster run on broad-mpg-gnomad
vep:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../hail-db-utils/run_vep.py \
	--genome-version 37 \
	gs://gnomad-browser/datasets/sczmeta.counts.vds \
	gs://gnomad-browser/datasets/sczmeta.counts.vep.vds

# requires vep-grch37 dataproc cluster run on broad-mpg-gnomad
# don't think it's working
all-annotations:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	./add_annotations_schizophrenia.py \
	--genome-version 37 \
	gs://gnomad-matts/sczmeta.counts.vep.vds

variants:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_schizophrenia_to_ES.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 200 \
	--genome_version 37 \
	--index schizophrenia \
	--index-type variant \
	--num-shards 1 \
	--schizophrenia-vds gs://gnomad-browser/datasets/sczmeta.counts.vep.vds

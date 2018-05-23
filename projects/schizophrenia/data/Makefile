#!make

include ../../../cluster/config.sh

vds:
	../../../hail-db-utils/submit.py \
	./convert_vcf_to_vds.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	--output-path gs://gnomad-browser/datasets/sczmeta.counts.vds \
	gs://tsingh/tmp/REL_2016_09_20/sczmeta.counts.vcf.gz

# requires vep-grch37 dataproc cluster run on broad-mpg-gnomad
vep:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../../hail-db-utils/run_vep.py \
	--genome-version 37 \
	gs://gnomad-browser/datasets/sczmeta.counts.vds \
	gs://gnomad-browser/datasets/sczmeta.counts.vep.vds

# requires vep-grch37 dataproc cluster run on broad-mpg-gnomad
# don't think it's working
all-annotations:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	./add_annotations_schizophrenia.py \
	--genome-version 37 \
	gs://gnomad-matts/sczmeta.counts.vep.vds

variants:
	../../../hail-db-utils/submit.py \
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

persist:
	curl -XPUT http://$(ES_IP)/schizophrenia/_settings -d '{ \
		"index.routing.allocation.include.data_node_hostname": "es-data-loading*", \
		"index.routing.allocation.exclude.data_node_hostname": "es-data-persistent*" \
	}'

# --- December 11, 2017 8:24 PM ---

dataproc-no-vep:
	../../../hail-db-utils/create_cluster_without_VEP.py \
	--project $(GCLOUD_PROJECT) \
	--zone $(GCLOUD_ZONE) \
	--machine-type $(DATAPROC_CLUSTER_MACHINE_TYPE) \
	no-vep 2

dataproc-vep-grch37:
	../../../hail-db-utils/create_cluster.GRCh37.py \
	--project $(GCLOUD_PROJECT) \
	--zone $(GCLOUD_ZONE) \
	--machine-type $(DATAPROC_CLUSTER_MACHINE_TYPE)
	--num-workers 10
	vep-grch37

get-files:
	gsutil -m cp -r gs://schizophrenia/browser/* gs://schizophrenia-browser/171211/

list-files:
	gsutil ls gs://schizophrenia-browser/171211

print-keytable-schema:
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster no-vep \
	print_keytable.py \
	gs://schizophrenia-browser/171211/2017-12-11_release-v1-browser-variant-count-by-population.kt && \
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster no-vep \
	print_keytable.py \
	gs://schizophrenia-browser/171211/2017-12-11_release-v1-browser-variant-annotation.kt && \
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster no-vep \
	print_keytable.py \
	gs://schizophrenia-browser/171211/2017-12-11_release-v1-browser-variant-in-schema.kt

# deprecated
171212-load-data:
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster no-vep \
	load_schizophrenia_data_171212.py

# deprecated
171214-export-results:
	../../../node_modules/.bin/babel-node export_gene_results_to_elastic.js

171214-get-files:
	gsutil -m cp -r gs://schizophrenia/browser/2017-12-14_release-v1-browser-merged-variant-table.kt gs://schizophrenia-browser/171214/ \
	gsutil -m cp -r gs://schizophrenia/browser/2017-12-13-schema-single-gene-burden-results.kt gs://schizophrenia-browser/171214/
	gsutil -m cp -r gs://schizophrenia/browser/2017-12-14_release-v1-browser-merged-variant-table-by-analysis-group.kt gs://schizophrenia-browser/171214/

171214-load-data:
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster no-vep \
	load_schizophrenia_data_171214.py

180512-load-data:
	../../../hail-db-utils/submit_hail_v0.1.py \
	--project $(GCLOUD_PROJECT) \
	--cluster no-vep \
	load_schizophrenia_data_180512.py

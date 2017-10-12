#!make

include ../../../cluster/config.sh

# assumes dataproc/es running already
all: export-east-london

prepare-raw-east-london: dataproc-vep-grch37 convert-east-london \
	print-vds-stats-east-london vep-annotate-east-london add_annotations-east-london

list-files:
	gsutil ls gs://dblof/data

dataproc-no-vep:
	../../hail-db-utils/create_cluster_without_VEP.py \
	--project $(GCLOUD_PROJECT) \
	--zone $(GCLOUD_ZONE) \
	--machine-type $(DATAPROC_CLUSTER_MACHINE_TYPE) \
	no-vep 2

dataproc-vep-grch37:
	../../hail-db-utils/create_cluster.GRCh37.py \
	--project $(GCLOUD_PROJECT) \
	--zone $(GCLOUD_ZONE) \
	--machine-type $(DATAPROC_CLUSTER_MACHINE_TYPE)
	--num-workers 10
	vep-grch37

convert-east-london:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../hail-db-utils/convert_vcf_to_vds.py \
	--output-path  +  \
	gs://dblof/data/Data_File_not_submittedScience_filteredSiteList.vep.vcf.bgz

print-vds-stats-east-london:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../hail-db-utils/print_vds_stats.py \
	gs://dblof/data/eastlondon.vds

vep-annotate-east-london:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster vep-grch37 \
	../../hail-db-utils/run_vep.py \
	gs://dblof/data/eastlondon.vds \
	gs://dblof/data/eastlondon.vep.vds

add_annotations-east-london:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster vep-grch37 \
	add_annotations_east_london.py \
	--genome-version 37 \
	gs://dblof/data/eastlondon.vep.vds

export-east-london:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_east_london_to_ES.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 200 \
	--genome_version 37 \
	--index east_london \
	--index-type variant \
	--exomes-vds $(EXOMES_VDS_PATH) \
	--genomes-vds $(GENOMES_VDS_PATH) \
	--num-shards 1

convert-clinvar:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../hail-db-utils/convert_vcf_to_vds.py \
	--output-path gs://dblof/data/clinvar_alleles.single.b37.vds  \
	gs://dblof/data/clinvar_alleles.single.b37.vcf.bgz

print-stats-clinvar:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	../../hail-db-utils/print_vds_stats.py \
	gs://dblof/data/clinvar_alleles.single.b37.vds

export-clinvar:
	../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_clinvar_to_ES.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 200 \
	--genome_version 37 \
	--index clinvar \
	--index-type variant \
	--clinvar-vds gs://dblof/data/clinvar_alleles.single.b37.vds \
	--num-shards 1

export-gtex-tissues-by-transcript:
	../../../hail-db-utils/submit.py \
	--project $(GCLOUD_PROJECT) \
	--cluster $(DATAPROC_CLUSTER_NAME) \
	export_gtex_tissue_tpms_by_transcript.py \
	--host $(ES_HOST_IP) \
	--port 9200 \
	--block-size 1000 \
	--num-shards 4 \
	--index gtex_tissue_tpms_by_transcript \
	--type tissue_tpms
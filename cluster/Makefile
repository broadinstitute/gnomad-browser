#!make
include config.sh
export $(shell sed 's/=.*//' config.sh)

all: cluster context elasticsearch

load-cluster: cluster context

# MACHINE_TYPE=n1-standard-4
MACHINE_TYPE=n1-standard-4
NUMBER_OF_NODES=1
GKE_CLUSTER_NAME=gke_$(GCLOUD_PROJECT)_$(GCLOUD_ZONE)_$(CLUSTER_NAME)

.PHONY: cluster
cluster:
	gcloud config set project $(GCLOUD_PROJECT)
	gcloud container clusters create $(CLUSTER_NAME) \
	--machine-type $(MACHINE_TYPE) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes $(NUMBER_OF_NODES) \
	--project $(GCLOUD_PROJECT)

default-node-pool:
	gcloud beta container node-pools create default-pool \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes $(NUMBER_OF_NODES) \
	--machine-type $(MACHINE_TYPE)

.PHONY: context
context:
	gcloud container clusters get-credentials $(CLUSTER_NAME) --zone=$(GCLOUD_ZONE)
	kubectl config set-context $(CLUSTER_NAME) \
	--cluster $(GKE_CLUSTER_NAME) \
	--user $(GKE_CLUSTER_NAME) \
	--namespace $(CLUSTER_NAMESPACE)
	kubectl config use-context gke_$(GCLOUD_PROJECT)_$(GCLOUD_ZONE)_$(CLUSTER_NAME)

dataproc-no-vep:
	../hail-db-utils/create_cluster_without_VEP.py \
	--project $(GCLOUD_PROJECT) \
	--zone $(GCLOUD_ZONE) \
	--machine-type $(DATAPROC_CLUSTER_MACHINE_TYPE) \
	--max-idle 20m \
	no-vep $(DATAPROC_CLUSTER_NUM_NODES)

.PHONY: spark
spark:
	make -C spark

.PHONY: elasticsearch
elasticsearch: context
	make -C elasticsearch load

.PHONY: delete-cluster
delete-elasticsearch-cluster:
	gcloud -q container clusters delete $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--project $(GCLOUD_PROJECT)
	kubectl config delete-context $(CLUSTER_NAME)

delete-dataproc-cluster:
	gcloud -q dataproc clusters delete $(DATAPROC_CLUSTER_NAME)

# load-gnomad:
# 	echo $$PWD
# 	# cd ..
# 	# shell pwd
# 	# make -C gnomad/data/make test
#
# load-schizophrenia:
# 	make -C $(shell pwd)/../schizophrenia/data/make test
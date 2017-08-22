#!make
include config.sh
export $(shell sed 's/=.*//' config.sh)

all: cluster context elasticsearch

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
	kubectl config use-context $(CLUSTER_NAME)

.PHONY: spark
spark:
	make -C spark

.PHONY: elasticsearch
elasticsearch:
	make -C elasticsearch

.PHONY: delete-cluster
delete-cluster:
	gcloud container clusters delete $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--project $(GCLOUD_PROJECT)
	kubectl config delete-context $(CLUSTER_NAME)

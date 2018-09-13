#!make
include ../config.sh
# export $(shell sed 's/=.*//' ../config.sh)

POOL_NAME=elasticsearch
NUMBER=12
LOADING_MACHINE_TYPE=n1-highmem-4
PERSISTENT_MACHINE_TYPE=n1-standard-4
LOCAL_SSD_COUNT=1

ES_SERVICE_FORWARDING_RULE_ID=$(shell gcloud compute forwarding-rules list --format='value[terminator=" "](name)' --filter=23.236.50.46)

persistent: create-persistent-nodes deploy-persistent-all

load: create-loading-nodes deploy-loading-all

create-loading-nodes:
	gcloud beta container node-pools create $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes $(NUMBER) \
	--machine-type $(LOADING_MACHINE_TYPE) \
	--local-ssd-count $(LOCAL_SSD_COUNT)

create-persistent-nodes:
	gcloud beta container node-pools create elasticpersistent \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes 1 \
	--machine-type $(PERSISTENT_MACHINE_TYPE)

delete-es-forwarding-rule:
	gcloud -q compute forwarding-rules delete $(ES_SERVICE_FORWARDING_RULE_ID) --region us-central1

deploy-loading-all: delete-es-forwarding-rule
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-discovery-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-master.yaml
	sleep 30
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-client.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-data.yaml

deploy-loading-data-pods:
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-data.yaml

delete-loading-data-pods:
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-data.yaml

deploy-persistent-all:
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-discovery-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-master.yaml
	sleep 20
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-client.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/stateful/es-persistent-volume.yaml
	sleep 10
	kubectl create -f kubernetes-elasticsearch-cluster/stateful/es-data-svc.yaml
	kubectl create -f kubernetes-elasticsearch-cluster/stateful/es-data-stateful.yaml

deploy-persistent-data-pods:
	@-kubectl create -f kubernetes-elasticsearch-cluster/stateful/es-persistent-volume.yaml
	sleep 10
	kubectl create -f kubernetes-elasticsearch-cluster/stateful/es-data-svc.yaml
	kubectl create -f kubernetes-elasticsearch-cluster/stateful/es-data-stateful.yaml
	sleep 60

set-throttle:
	./set_throttle.sh

reallocate-shards:
	./reallocate.sh

delete-all-indices:
	curl -XDELETE $(ES_IP):9200/*

kibana:
	@-kubectl create -f kubernetes-elasticsearch-cluster/kibana-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/kibana.yaml

head:
	@-kubectl create -f kubernetes-elasticsearch-cluster/elasticsearch-head-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/elasticsearch-head.yaml

delete-deployments:
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-master.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-client.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-data.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-data.yaml 2>/dev/null

delete-services:
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-discovery-svc.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-svc.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/kibana-svc.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/kibana.yaml 2>/dev/null
	@-kubectl create -f kubernetes-elasticsearch-cluster/elasticsearch-head-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/elasticsearch-head.yaml

delete-load-nodes:
	gcloud -q beta container node-pools delete $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE)

delete-all: delete-deployments delete-services kibana
	gcloud beta container node-pools delete $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE)



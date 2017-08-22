#!make
include ../config.sh
# export $(shell sed 's/=.*//' ../config.sh)

POOL_NAME=elasticsearch
NUMBER=1
MACHINE_TYPE=n1-standard-4
LOCAL_SSD_COUNT=1

all: create-nodes deploy

create-nodes:
	gcloud beta container node-pools create $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes $(NUMBER) \
	--machine-type $(MACHINE_TYPE) \
	--local-ssd-count $(LOCAL_SSD_COUNT)

deploy: delete-deployments
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-discovery-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-master.yaml
	sleep 20
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-client.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-data.yaml

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

delete-services:
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-discovery-svc.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-svc.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/kibana-svc.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/kibana.yaml 2>/dev/null
	@-kubectl create -f kubernetes-elasticsearch-cluster/elasticsearch-head-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/elasticsearch-head.yaml

delete-all: delete-deployments delete-services kibana
	gcloud beta container node-pools delete $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE)
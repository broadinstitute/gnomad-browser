
ELASTICSEARCH_NODE_POOL_NAME=elasticsearch
ELASTICSEARCH_NODE_MACHINE_TYPE=n1-standard-4
ELASTICSEARCH_NODE_NUMBER=1

all: create-nodes deploy

create-nodes:
	gcloud beta container node-pools create $(ELASTICSEARCH_NODE_POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes $(ELASTICSEARCH_NODE_NUMBER) \
	--machine-type $(ELASTICSEARCH_NODE_MACHINE_TYPE)

deploy: delete-deployments
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-discovery-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-svc.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-master.yaml
	sleep 20
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-client.yaml
	@-kubectl create -f kubernetes-elasticsearch-cluster/es-data.yaml

delete-deployments:
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-master.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-client.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-data.yaml 2>/dev/null

delete-services:
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-discovery-svc.yaml 2>/dev/null
	@-kubectl delete -f kubernetes-elasticsearch-cluster/es-svc.yaml 2>/dev/null

delete-all: delete-deployments delete-services
	gcloud beta container node-pools delete $(ELASTICSEARCH_NODE_POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \

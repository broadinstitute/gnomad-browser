#!make
include ../config.sh
# export $(shell sed 's/=.*//' ../config.sh)

POOL_NAME=redis
NUMBER=1
MACHINE_TYPE=n1-standard-4
LOCAL_SSD_COUNT=1

create-redis-nodes:
	gcloud beta container node-pools create $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes $(NUMBER) \
	--machine-type $(MACHINE_TYPE) \
	--local-ssd-count $(LOCAL_SSD_COUNT)

create-redis-containers:
		# Create a bootstrap master
	kubectl create -f redis-master.yaml

	# Create a service to track the sentinels
	kubectl create -f redis-sentinel-service.yaml

	# Create a replication controller for redis servers
	kubectl create -f redis-controller.yaml

	# Create a replication controller for redis sentinels
	kubectl create -f redis-sentinel-controller.yaml



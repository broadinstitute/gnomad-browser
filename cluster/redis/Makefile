#!make
include ../config.sh
# export $(shell sed 's/=.*//' ../config.sh)

POOL_NAME=redis
NUMBER=1
MACHINE_TYPE=n1-highmem-8
LOCAL_SSD_COUNT=0

start-redis: create-redis-nodes create-redis-containers

create-redis-nodes:
	gcloud beta container node-pools create $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE) \
	--num-nodes $(NUMBER) \
	--machine-type $(MACHINE_TYPE) \
	--local-ssd-count $(LOCAL_SSD_COUNT)

create-redis-containers:
		# Create a bootstrap master
	@-kubectl create -f redis-master.yaml

	# Create a service to track the sentinels
	@-kubectl create -f redis-sentinel-service.yaml

	# Create a replication controller for redis servers
	@-kubectl create -f redis-controller.yaml

	# Create a replication controller for redis sentinels
	@-kubectl create -f redis-sentinel-controller.yaml


scale-redis-containers:
	kubectl scale rc redis --replicas=3
	kubectl scale rc redis-sentinel --replicas=3

delete-redis-containers:
	@-kubectl delete -f redis-master.yaml
	@-kubectl delete -f redis-sentinel-service.yaml
	@-kubectl delete -f redis-controller.yaml
	@-kubectl delete -f redis-sentinel-controllerpickup.yaml

delete-original-master:
	# Delete the original master pod
	# Note: If you are running all the above commands consecutively including this one in a shell script, it may NOT work out. When you run the above commands, let the pods first come up, especially the redis-master pod. Else, the sentinel pods would never be able to know the master redis server and establish a connection with it.
	kubectl delete pods redis-master

delete-redis-nodes: delete-redis-containers
	gcloud -q beta container node-pools delete $(POOL_NAME) \
	--cluster $(CLUSTER_NAME) \
	--zone $(GCLOUD_ZONE)

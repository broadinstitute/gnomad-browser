

MASTER_NODE_POOL_NAME=spark-master
MASTER_NODE_MACHINE_TYPE=n1-standard-4
MASTER_NODE_NUMBER=1
WORKER_NODE_POOL_NAME=spark-worker
WORKER_NODE_MACHINE_TYPE=n1-standard-4
WORKER_NODE_NUMBER=1

all:
	@echo $(WORKER_NODE_POOL_NAME)

# all: create-master-nodes create-worker-notes
#
# create-master-nodes:
# 	gcloud beta container node-pools create $MASTER_NODE_POOL_NAME \
# 	--cluster $CLUSTER_NAME \
# 	--zone $GCLOUD_ZONE \
# 	--num-nodes $MASTER_NODE_NUMBER \
# 	--machine-type $MASTER_NODE_MACHINE_TYPE
#
# create-worker-nodes:
# 	gcloud beta container node-pools create $WORKER_NODE_POOL_NAME \
# 	--cluster $CLUSTER_NAME \
# 	--zone $GCLOUD_ZONE \
# 	--preemptible \
# 	--num-nodes $WORKER_NODE_NUMBER \
# 	--machine-type $WORKER_NODE_MACHINE_TYPE


context:
	make -C cluster context

# load-and-persist: load-data persist-data

# load-data:
# 	make -C cluster cluster
# 	make -C cluster elasticsearch
# 	make -C cluster dataproc-no-vep
# 	make -C packages/gnomad/data all

persist-data:
	make -C cluster/elasticsearch create-persistent-nodes
	make -C cluster/elasticsearch deploy-persistent-data-pods
	make -C cluster/elasticsearch reallocate-shards
	make takedown-loading-nodes

takedown-loading-nodes:
	# make -C cluster delete-dataproc-cluster
	make -C cluster/elasticsearch delete-loading-data-pods
	make -C cluster/elasticsearch delete-load-nodes

# load-gnomad-variants:
# 	# make -C cluster dataproc-no-vep
# 	# make -C cluster/elasticsearch create-loading-nodes
# 	# make -C cluster/elasticsearch deploy-loading-data-pods
# 	make -C cluster/elasticsearch set-throttle
# 	make -C projects/gnomad/data variants-new-load
# 	# make -C projects/gnomad/data variants-new-load-only-exomes
# 	make -C cluster/elasticsearch reallocate-shards
# 	make takedown-loading-nodes
# 	make -C packages/api/deploy chunks

gnomad:
	make -C cluster cluster
	make -C cluster context
	make -C cluster/elasticsearch persistent
	make -C cluster/redis start-redis
	make -C packages/api/deploy start-api
	make -C projects/gnomad/deploy start-gnomad


start-dev:
	make -C cluster cluster
	make -C cluster context
	make -C cluster/elasticsearch dev

delete-data-cluster:
	make -C cluster delete-elasticsearch-cluster & \
	make -C cluster delete-dataproc-cluster

legacy:
	make -C projects/gnomad/deploy update & \
	make -C packages/api/deploy update

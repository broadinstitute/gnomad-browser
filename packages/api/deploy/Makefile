#!make
include ../../../cluster/config.sh

POOL_NAME=redis
PROJECT_NAME=gnomad-api

SERVICE_FORWARDING_RULE_ID=$(shell gcloud compute forwarding-rules list --format='value[terminator=" "](name)' --filter=35.184.79.173)

start-api: mongo-legacy gnomad-api gnomad-api-service

local-redis:
	redis-server /usr/local/etc/redis.conf

mongo-legacy:
	@-kubectl create -f gnomad-mongo-controller.yaml
	@-kubectl create -f gnomad-mongo-service.yaml

gnomad-api:
	@-kubectl create -f gnomad-api-controller.yaml

# gnomad-api-service-delete-previous:
# 	@-gcloud -q compute forwarding-rules delete $(SERVICE_FORWARDING_RULE_ID) --region $(GCLOUD_REGION)
# 	kubectl create -f gnomad-api-svc.yaml

gnomad-api-service:
	kubectl expose deployment $(PROJECT_NAME) \
	--type="LoadBalancer" \
	--load-balancer-ip="35.185.72.124"

set-max-result:
	curl -XPUT "http://localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/*/_settings" -d '{ "index" : { "max_result_window" : 500000 } }'

redis-interactive:
	kubectl exec -it redis-master -- redis-cli

redis-cat-config:
	kubectl exec -it redis-master -- cat ../redis-master/redis.conf

redis-get-config:
	kubectl exec -it redis-master -- redis-cli config get appendonly
	kubectl exec -it redis-master -- redis-cli config get save

redis-set-config:
	kubectl exec -it redis-master -- redis-cli config set save 900 1
	kubectl exec -it redis-master -- redis-cli config set appendonly no
	kubectl exec -it redis-master -- redis-cli config rewrite

redis-save:
	kubectl exec -it redis-master -- redis-cli BGSAVE

redis-monitor:
	kubectl exec -it redis-master -- redis-cli monitor

redis-count-cache:
	kubectl exec -it redis-master -- redis-cli KEYS "*" | wc -l

redis-stats: redis-count-cache redis-dump-size

redis-flush:
	kubectl exec -it redis-master -- redis-cli flushall

redis-flush-local:
	redis-cli flushall

redis-dump-size:
	kubectl exec -it redis-master -- ls -al --block-size=M /redis-master-data

dev:
	redis-cli flushall
	npm run dev

TIME=$(shell date "+%Y%m%d-%H%M%S")
LOGS_PATH=../../../logs
RESOURCES_PATH=../../../resources
BIN_DIR=../../../node_modules/.bin
LOCAL_API=http://localhost:8007
REMOTE_API=http://35.184.112.239
CLIENT_LOG_FILE_PATH=$(LOGS_PATH)/client_log_$(TIME).csv
DATABASE_LOG_FILE_PATH=$(LOGS_PATH)/database_log_$(TIME).csv

get-database-logs:
	kubectl logs -f $(API_POD) 2>&1 | tee $(DATABASE_LOG_FILE_PATH)

list-gene-files:
	ls $(RESOURCES_PATH) | grep -i genes
	# cat $(RESOURCES_PATH)/genes.json

list-log-files:
	ls $(LOGS_PATH)

genes-fetched:
	cat $(LOGS_PATH)/client_log_20171112-092303.csv | wc -l

precache-genes:
	# sleep 10
	GNOMAD_API_URL=$(API_URL) $(BIN_DIR)/babel-node precache_genes.js $(PRECACHE_GENES_ARGUMENTS) 2>&1 | tee $(CLIENT_LOG_FILE_PATH)

precache-genes-local: redis-flush-local
	@make \
	API_URL=$(LOCAL_API) \
	PRECACHE_GENES_ARGUMENTS=$(RESOURCES_PATH)/genes_subset.json \
	precache-genes

precache-genes-subset: update
	sleep 10
	@make \
	API_URL=$(REMOTE_API) \
	PRECACHE_GENES_ARGUMENTS=$(RESOURCES_PATH)/100_slow_genes_171111-163002.json \
	precache-genes

precache-genes-subset-no-flush: update-gnomad-api
	sleep 10
	kubectl get pods
	@make \
	API_URL=$(REMOTE_API) \
	PRECACHE_GENES_ARGUMENTS=$(RESOURCES_PATH)/100_slow_genes_171111-140000.json \
	precache-genes

precache-genes-subset-no-update:
	@make \
	API_URL=$(REMOTE_API) \
	PRECACHE_GENES_ARGUMENTS=$(RESOURCES_PATH)/100_slow_genes_171111-140000.json \
	precache-genes

precache-genes-all:
	@make \
	API_URL=$(REMOTE_API) \
	PRECACHE_GENES_ARGUMENTS=$(RESOURCES_PATH)/genes.json \
	precache-genes

chunks:
	@make \
	API_URL=$(REMOTE_API) \
	PRECACHE_GENES_ARGUMENTS="$(RESOURCES_PATH)/clean_genes_list_171112.json 5" \
	precache-genes

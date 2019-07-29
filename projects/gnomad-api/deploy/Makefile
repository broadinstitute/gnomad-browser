#!make
include ../../../cluster/config.sh

POOL_NAME=redis
PROJECT_NAME=gnomad-api

start-api: mongo-legacy gnomad-api

local-redis:
	redis-server /usr/local/etc/redis.conf

mongo-legacy:
	@-kubectl create -f gnomad-mongo-controller.yaml
	@-kubectl create -f gnomad-mongo-service.yaml

gnomad-api:
	@-kubectl create -f gnomad-api-controller.yaml

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
BIN_DIR=../../../node_modules/.bin
DATABASE_LOG_FILE_PATH=$(LOGS_PATH)/database_log_$(TIME).csv

get-database-logs:
	kubectl logs -f $(API_POD) 2>&1 | tee $(DATABASE_LOG_FILE_PATH)

list-log-files:
	ls $(LOGS_PATH)

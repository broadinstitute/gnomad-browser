#!make
include ../../../cluster/config.sh

start-api: gnomad-api

gnomad-api:
	@-kubectl create -f gnomad-api-controller.yaml

set-max-result:
	curl -XPUT "http://localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/*/_settings" -d '{ "index" : { "max_result_window" : 500000 } }'

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

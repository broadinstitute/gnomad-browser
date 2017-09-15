#!/bin/bash

. ../config.sh

curl -XPUT $ES_IP:9200/*/_settings -d '{
  "index.routing.allocation.exclude.data_node_hostname": "es-data-loading*",
  "index.routing.allocation.include.data_node_hostname": "es-data-persistent*"
}'

while [[ $(curl -s ${ES_IP}:9200/_cat/shards | grep loading) ]] ; do
  sleep 2
  NUM_SHARDS_TO_ALLOCATE=$(curl -s ${ES_IP}:9200/_cat/shards | grep loading | wc -l)
  echo "$(date) Transferring $NUM_SHARDS_TO_ALLOCATE shards..." ; \
done

exit 0

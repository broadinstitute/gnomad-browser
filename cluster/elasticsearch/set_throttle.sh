#!/bin/bash

. ../config.sh

curl -XPUT $ES_IP:9200/_cluster/settings -d '{
    "persistent" : {
        "indices.store.throttle.max_bytes_per_sec" : "200mb"
    }
}'

curl -XPUT $ES_IP:9200/_cluster/settings -d '{
    "transient" : {
        "cluster.routing.allocation.cluster_concurrent_rebalance": "5"
    }
}'

curl -XPUT $ES_IP:9200/_cluster/settings -d '{
    "transient" : {
        "indices.recovery.max_bytes_per_sec": "200mb"
    }
}'

exit 0

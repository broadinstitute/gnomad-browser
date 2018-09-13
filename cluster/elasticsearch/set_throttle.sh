#!/bin/bash

. ../config.sh

curl -XPUT localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/_cluster/settings -d '{
    "persistent" : {
        "indices.store.throttle.max_bytes_per_sec" : "200mb"
    }
}'

curl -XPUT localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/_cluster/settings -d '{
    "transient" : {
        "indices.store.throttle.type" : "none"
    }
}'

curl -XPUT localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/*/_settings -d '{ "index" : { "max_result_window" : 500000 } }'

curl -XPUT localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/_cluster/settings -d '{
    "persistent" : {
        "cluster.routing.allocation.cluster_concurrent_rebalance": "5"
    }
}'

curl -XPUT localhost:8001/api/v1/namespaces/default/services/elasticsearch:9200/proxy/_cluster/settings -d '{
    "persistent" : {
        "indices.recovery.max_bytes_per_sec": "200mb"
    }
}'



exit 0

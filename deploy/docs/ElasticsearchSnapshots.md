# Elasticsearch Snapshots

References:

- https://www.elastic.co/guide/en/elasticsearch/reference/6.8/modules-snapshots.html
- https://www.elastic.co/guide/en/cloud-on-k8s/1.2/k8s-snapshots.html

Follow the steps in [ElasticsearchConnection.md](./ElasticsearchConnection.md) for accessing the Elasticsearch API.

### Register a snapshot repository

`deployctl setup` (or the terraform module) configures Elasticsearch with credentials to access a GCS bucket. That bucket should be used here.

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPUT http://localhost:9200/_snapshot/backups --header "Content-Type: application/json" --data @- <<EOF
{
   "type": "gcs",
   "settings": {
     "bucket": "gnomad-browser-elasticsearch-snapshots",
     "client": "default",
     "compress": true
   }
}
EOF
```

If you'd like to configure readonly access to a snapshot bucket (e.g. if you're restoring a testing cluster from prod snaps), you can add a readonly flag to the register command above:

`    "readonly": true`

### Create a snapshot

This creates a snapshot named with the current date.

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPUT 'http://localhost:9200/_snapshot/backups/%3Csnapshot-%7Bnow%7BYYYY.MM.dd.HH.mm%7D%7D%3E'
```

### List all snapshots in repository

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_snapshot/backups/_all | jq ".snapshots[].snapshot"
```

### Get snapshot status

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_snapshot/backups/<snapshot-name> | jq ".snapshots[0]"
```

To see more details about snapshot size and individual indices/shards, use:

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_snapshot/backups/<snapshot-name>/_status | jq ".snapshots[0]"
```

### Restore a snapshot

#### Restoring all indices

If you're restoring an entire cluster, you may want to set a few flags to improve recovery speed:

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
"persistent" : {
  "cluster.routing.allocation.node_concurrent_recoveries" : "2",
  "indices.recovery.max_bytes_per_sec": "400mb"
  }
}'
```

When restoring all indices, use the `_restore` API with a wildcard indices parameter:

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -X POST "localhost:9200/_snapshot/backups/<snapshot-name>/_restore" -H 'Content-Type: application/json' -d '{
  "indices": "*",
  "index_settings": {
    "index.number_of_replicas": 0
  }
}'
```

#### Restoring specific indices

When you only want to restore a specific index or indices, specify those in the indices field with a comma separator. For large restores, you may want to omit the `wait_for_completion=true` parameter:

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -X POST "localhost:9200/_snapshot/backups/<snapshot-name>/_restore?wait_for_completion=true&pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "index-name-2023-01-01--00-00,index-name2-2023-01-01--00-00",
  "index_settings": {
    "index.number_of_replicas": 0
  },
  "include_global_state": false,
  "rename_pattern": "(.+)",
  "rename_replacement": "restored-$1",
  "include_aliases": false
}
'
```

This will restore the index with a "restored-" prefixed to the name. When ready, you can update your index alias to point to the restored index, if desired. See [Elasticsearch Index Aliases](./ElasticsearchIndexAliases.md) for instructions.

### Delete a snapshot

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XDELETE http://localhost:9200/_snapshot/backups/<snapshot-name>
```

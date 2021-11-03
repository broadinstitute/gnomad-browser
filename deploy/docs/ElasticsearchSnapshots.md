# Elasticsearch Snapshots

References:

- https://www.elastic.co/guide/en/elasticsearch/reference/6.8/modules-snapshots.html
- https://www.elastic.co/guide/en/cloud-on-k8s/1.2/k8s-snapshots.html

Follow the steps in [ElasticsearchConnection.md](./ElasticsearchConnection.md) for accessing the Elasticsearch API.

### Register a snapshot repository

`deployctl setup` configures Elasticsearch with credentials to access a GCS bucket. That bucket should be used here.

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

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPOST http://localhost:9200/_snapshot/backups/<snapshot-name>/_restore
```

### Delete a snapshot

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XDELETE http://localhost:9200/_snapshot/backups/<snapshot-name>
```

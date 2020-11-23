# Elasticsearch index aliases

https://www.elastic.co/guide/en/elasticsearch/reference/6.8/indices-aliases.html

Follow the steps in [ElasticsearchConnection.md](./ElasticsearchConnection.md) for accessing the Elasticsearch API.

### Viewing aliases

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_cat/aliases
```

### Changing an alias

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPOST http://localhost:9200/_aliases --header "Content-Type: application/json" --data @- <<EOF
{
   "actions": [
      {"remove": {"index": "<old_index>", "alias": "alias"}},
      {"add": {"index": "<new_index>", "alias": "alias"}}
   ]
}
EOF
```

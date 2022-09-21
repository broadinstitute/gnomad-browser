# Elasticsearch index aliases

https://www.elastic.co/guide/en/elasticsearch/reference/6.8/indices-aliases.html

Follow the steps in [ElasticsearchConnection.md](./ElasticsearchConnection.md) for accessing the Elasticsearch API.

### Viewing indices and aliases

To view indices

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_cat/indices
```

To view aliases

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" http://localhost:9200/_cat/aliases
```

### Changing an alias

Use "remove" and "add" as needed to modify indices and their aliases.

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPOST http://localhost:9200/_aliases --header "Content-Type: application/json" --data @- <<EOF
{
   "actions": [
      {"remove": {"index": "<old_index_id>", "alias": "<old_alias_name>"}},
      {"add": {"index": "<new_index_id>", "alias": "<new_alias_name"}}
   ]
}
EOF
```

This action is atomic, as such you can safely use this to replace the index associated with a given alias.

# Loading large datasets

## Running a large pipeline

To speed up the execution time of large pipelines (such as the Short Variants), add additional workers nodes to the dataproc cluster you create.

```
./deployctl dataproc-cluster start variants --num-workers 32
```

## Loading large datasets into Elasticsearch

To speed up loading large datasets into Elasticsearch, spin up many temporary pods and spread indexing across them.
Then move ES shards from temporary pods onto permanent pods.

### 1. Set [shard allocation filters](https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-allocation-filtering.html)

This configures existing indices so that data stays on permanent data pods and does not migrate to temporary ingest pods. You can issue the following request to the `_all` index to pin existing indices to a particular nodeSet.

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/_all/_settings" -XPUT --header "Content-Type: application/json" --data @- <<EOF
{"index.routing.allocation.require._name": "gnomad-es-data-green*"}
EOF
```

### 2. Add nodes to the es-ingest node pool

This can be done by adjusting the `pool_num_nodes` variable in our [terraform deployment](https://github.com/broadinstitute/gnomad-terraform/blob/8519ea09e697afc7993b278f1c2b4240ae21c8a4/exac-gnomad/services/browserv4/main.tf#L99) and opening a PR to review and apply the infrastructure change.

### 3. When the new es-ingest GKE nodes are ready, Add temporary pods to Elasticsearch cluster

```
./deployctl elasticsearch apply --n-ingest-pods=48
```

The number of ingest pods should match the number of nodes in the `es-ingest` node pool.

Watch pods' readiness with `kubectl get pods -w`.

### 4. Create a Dataproc cluster and load a Hail table.

The number of workers in the cluster should match the number of ingest pods.

```
./deployctl dataproc-cluster start es --num-preemptible-workers 48
./deployctl elasticsearch load-datasets --dataproc-cluster es $DATASET
./deployctl dataproc-cluster stop es
```

### 5. Determine available space on the persistent data nodes, and how much space you'll need for the new data

First, Look at the total size of all indices in Elasticsearch to see how much storage will be required for permanent pods. Add up the values in the `store.size` column output from the [cat indices API](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/cat-indices.html).

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" 'http://localhost:9200/_cat/indices?v'
```

Next, see how much total space is available on the persistent data nodes. Add up the values in the `disk.avail` column output from the [cat allocation API](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/cat-allocation.html)

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" 'http://localhost:9200/_cat/allocation/gnomad-es-data*?v'
```

Depending on how much additional space you need, you can take one of three options:

1. Make no modifications to the ES cluster, your new indices will fit on the existing nodes, and won't fill the disks past about ~82%.
2. You need slightly more space, so you can increase the size of the disks in the current persistent data nodeSet.
3. You need at least as much space as ~80% of a data pod holds (around ~1.4TB as of this writing), so you add another persistent data node.

#### Option 1: No modifications

You don't need to make modifications, so you can simply move your new index to the permanent data pods. Skip to [Move data to persitent data pods](#6-move-data-to-persistent-data-pods)

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/_all/_settings" -XPUT --header "Content-Type: application/json" --data @- <<EOF
{"index.routing.allocation.require._name": "gnomad-es-data-green*"}
EOF
```

#### Option 2: Increase disk size

You can increase the size of the disks on the of the existing data pods. This will do an online resize of the disks. It's a good idea to ensure you have a recent snapshot of the cluster before doing this. See [Elasticsearch snapshots](./ElasticsearchSnapshots.md) for more information.

Edit [elasticsearch.yaml.jinja2](../manifests/elasticsearch/elasticsearch.yaml.jinja2) and set the storage request in the `volumeClaimTemplates` section of the persistent data nodeSet based on the total size of all indices. Keep in mind that the storage request there is per-pod.

Then apply the changes:

```
./deployctl elasticsearch apply --n-ingest-pods=48
```

#### Option 3: Add another persistent data node

Edit [elasticsearch.yaml.jinja2](../manifests/elasticsearch/elasticsearch.yaml.jinja2) and add a new pod to the persistent nodeSet by incrementing the `count` parameter in the `data-{green,blue}` nodeSet. Note that when applied, this will cause data movement as Elasticsearch rebalances shards across the persistent nodeSet. This is generally low-impact, but it's a good idea to do this during a low-traffic period.

Apply the changes:

```
./deployctl elasticsearch apply --n-ingest-pods=48
```

### 6. Move data to persistent data pods

Set [shard allocation filters](https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-allocation-filtering.html) on new indices to move shards to the persistent data nodeSet. Do this for any newly loaded indices as well as any pre-existing indices that will be kept. Replace $INDEX with the name of indicies you need to move.

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/$INDEX/_settings" -XPUT --header "Content-Type: application/json" --data @- <<EOF
{"index.routing.allocation.require._name": "gnomad-es-data-green*"}
EOF
```

Watch shard movement with the [cat shards API](https://www.elastic.co/guide/en/elasticsearch/reference/current/cat-shards.html).

```
curl -s -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/_cat/shards?v" | grep RELOCATING
```

(Optional) Set elasticsearch recovery parameters for faster shard copies. By default, Elasticsearch speed-limits recovery activity to prioritize query performance. You can tune the following settings to increase the speed at which shards are copied. The following example has been found to be a reasonable speed to run large scale shard movements during slower periods (overnight). The concurrent recoveries setting is per-node, so the actual maximum number of recoveries will depend on how large the cluster actually is:

```
curl -u "elastic:$ELASTICSEARCH_PASSWORD" -XPUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
"persistent" : {
  "cluster.routing.allocation.node_concurrent_recoveries" : "2",
  "indices.recovery.max_bytes_per_sec": "400mb"
  }
}'

```

### 7. Once data is done being moved, remove the ingest pods

```
./deployctl elasticsearch apply --n-ingest-pods=0
```

Watch the cluster to ensure that the ingest pods are successfully terminated:

```
kubectl get pods -w
```

### 8. Once the ingest pods are terminated, resize the es-ingest node pool to 0

Set the `pool_num_nodes` varible for the es-ingest node pool to 0 in our [terraform deployment](https://github.com/broadinstitute/gnomad-terraform/blob/8519ea09e697afc7993b278f1c2b4240ae21c8a4/exac-gnomad/services/browserv4/main.tf#L99) and open a PR to review and apply the infrastructure change.

### 9. Clean up, delete any unused indices.

If cleaning up unused indices affords you enough space to remove a persistent data node, you can do so by editing the `count` parameter in the `data-{green/blue}` nodeSet in [elasticsearch.yaml.jinja2](../manifests/elasticsearch/elasticsearch.yaml.jinja2). Note that applying this will cause data movement, and it's a good idea to do this during a low-traffic period.

```
./deployctl elasticsearch apply
```

Lastly, besure to update relevant [Elasticsearch index aliases](./ElasticsearchIndexAliases.md) and [clear caches](./RedisCache.md).

### References

- [Elastic Cloud on K8S](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html)
- [Run Elasticsearch on ECK](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-elasticsearch-specification.html)
- [Tune for indexing speed](https://www.elastic.co/guide/en/elasticsearch/reference/master/tune-for-indexing-speed.html)
- [Tune for disk usage](https://www.elastic.co/guide/en/elasticsearch/reference/master/tune-for-disk-usage.html)

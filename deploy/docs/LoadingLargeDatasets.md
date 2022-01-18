# Loading large datasets

To speed up loading large datasets into Elasticsearch, spin up many temporary pods and spread indexing across them.
Then move ES shards from temporary pods onto permanent pods.

- Set [shard allocation filters](https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-allocation-filtering.html)
  on existing indices so that data stays on permanent data pods and does not migrate to temporary ingest pods.

- Create GKE node pool.

  ```
  gcloud container node-pools create es-ingest \
     --cluster $GKE_CLUSTER_NAME \
     --zone $ZONE \
     --service-account $SERVICE_ACCOUNT \
     --num-nodes 48 \
     --machine-type e2-highmem-4 \
     --enable-autorepair --enable-autoupgrade \
     --shielded-secure-boot \
     --metadata=disable-legacy-endpoints=true
  ```

- Add temporary pods to Elasticsearch cluster.

  ```
  ./deployctl elasticsearch apply --n-ingest-pods=48
  ```

  The number of ingest pods should match the number of nodes in the `es-ingest` node pool.

  Watch pods' readiness with `kubectl get pods -w`.

- Create a Dataproc cluster and load a Hail table. The number of workers in the cluster should match the number of ingest pods.

  ```
  ./deployctl dataproc-cluster start es --num-preemptible-workers 48
  ./deployctl elasticsearch load-datasets --dataproc-cluster es $DATASET
  ./deployctl dataproc-cluster stop es
  ```

- Look at the total size of all indices in Elasticsearch to see how much storage will be required for permanent pods.
  Add up the values in the `store.size` column output from the [cat indices API](https://www.elastic.co/guide/en/elasticsearch/reference/current/cat-indices.html).

- Edit [elasticsearch.yaml.jinja2](../manifests/elasticsearch/elasticsearch.yaml.jinja2) and add a new persistent data node set.
  Set the storage request in the `volumeClaimTemplates` section of the new node set based on the total size of all indices.
  Keep in mind that the storage request there is per-pod. If necessary, add permanent data pods to the cluster. Resize the `es-data`
  node pool if necessary.

  ```
  ./deployctl elasticsearch apply --n-ingest-pods=48
  ```

- Set [shard allocation filters](https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-allocation-filtering.html)
  on new indices to move shards to the new node set. Do this for any newly loaded indices as well as any pre-existing indices that will be kept.

  ```
  curl -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/$INDEX/_settings" -XPUT --header "Content-Type: application/json" --data @- <<EOF
  {"index.routing.allocation.require._name": "gnomad-es-data-blue"}
  EOF
  ```

  Watch shard movement with the [cat shards API](https://www.elastic.co/guide/en/elasticsearch/reference/current/cat-shards.html).

  ```
  curl -s -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/_cat/shards?v" | grep RELOCATING
  ```

- Remove ingest pods.

  ```
  ./deployctl elasticsearch apply --n-ingest-pods=0
  ```

- Delete ingest node pool.

  ```
  gcloud container node-pools delete es-ingest \
    --cluster $GKE_CLUSTER_NAME \
    --zone $ZONE
  ```

- Delete any unused indices.

- Edit elasticsearch.yaml.jinja2 and remove the old persistent data node set. Apply changes. Resize the `es-data` node pool if necessary.

  ```
  ./deployctl elasticsearch apply
  ```

- Update relevant [Elasticsearch index aliases](./ElasticsearchIndexAliases.md) and [clear caches](./RedisCache.md).

## References

- [Elastic Cloud on K8S](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html)
- [Run Elasticsearch on ECK](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-elasticsearch-specification.html)
- [Tune for indexing speed](https://www.elastic.co/guide/en/elasticsearch/reference/master/tune-for-indexing-speed.html)
- [Tune for disk usage](https://www.elastic.co/guide/en/elasticsearch/reference/master/tune-for-disk-usage.html)

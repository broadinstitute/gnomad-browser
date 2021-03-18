# Loading large datasets

To speed up loading large datasets into Elasticsearch, spin up many temporary pods and spread indexing across them.
Then move ES shards from temporary pods onto permanent pods.

- Create GKE node pool.

  ```
  gcloud container node-pools create es-ingest \
     --cluster $GKE_CLUSTER_NAME \
     --zone $ZONE \
     --service-account $SERVICE_ACCOUNT \
     --num-nodes 48 \
     --enable-autorepair --enable-autoupgrade \
     --shielded-secure-boot \
     --metadata=disable-legacy-endpoints=true
  ```

- Add temporary pods to Elasticsearch cluster.

  ```
  ./deployctl elasticsearch apply --n-data-pods=2 --n-ingest-pods=48
  ```

  The number of ingest pods can vary. Very large numbers of ingest pods may require adjusting the maximum nodes
  setting for the `elasticsearch-data` node pool's autoscaler.

  Watch pods' readiness with `kubectl get pods -w`.

- Create a Dataproc cluster and load a Hail table.

  ```
  ./deployctl dataproc-cluster start es --num-preemptible-workers 48
  ./deployctl elasticsearch load-datasets --dataproc-cluster es $DATASET
  ./deployctl dataproc-cluster stop es
  ```

- Look at the total size of all indices in Elasticsearch to see how much storage will be required for permanent pods.
  Edit the `volumeClaimTemplates` section of the `data` node set in elasticsearch.yaml.jinja2 accordingly. Keep in mind
  that the storage request there is per-pod. If necessary, add permanent data pods to the cluster.

  ```
  ./deployctl elasticsearch apply --n-data-pods=3 --n-ingest-pods=48
  ```

- Set [shard allocation filters](https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-allocation-filtering.html)
  on new indices to move data from temporary pods to permanent data pods. Watch shard movement with the
  [cat shards API](https://www.elastic.co/guide/en/elasticsearch/reference/current/cat-shards.html)

  ```
  curl -u "elastic:$ELASTICSEARCH_PASSWORD" "http://localhost:9200/$INDEX/_settings" -XPUT --header "Content-Type: application/json" --data @- <<EOF
  {"index.routing.allocation.require._name": "gnomad-es-data-*"}
  EOF
  ```

- Remove ingest pods.

  ```
  ./deployctl elasticsearch apply --n-data-pods=3 --n-ingest-pods=0
  ```

- Delete node pool.

  ```
  gcloud container node-pools delete es-ingest \
    --cluster $GKE_CLUSTER_NAME \
    --zone $ZONE
  ```

## References

- [Elastic Cloud on K8S](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-overview.html)
- [Run Elasticsearch on ECK](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-elasticsearch-specification.html)
- [Tune for indexing speed](https://www.elastic.co/guide/en/elasticsearch/reference/master/tune-for-indexing-speed.html)
- [Tune for disk usage](https://www.elastic.co/guide/en/elasticsearch/reference/master/tune-for-disk-usage.html)

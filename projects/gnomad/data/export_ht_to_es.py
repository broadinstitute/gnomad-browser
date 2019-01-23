import argparse

import hail as hl

from hail_scripts.v02.utils.elasticsearch_client import ElasticsearchClient


p = argparse.ArgumentParser()
p.add_argument("--ht-url", help="URL of Hail table to export", required=True)
p.add_argument("--host", help="Elasticsearch host or IP", required=True)
p.add_argument("--port", help="Elasticsearch port", default=9200, type=int)
p.add_argument("--index-name", help="Elasticsearch index name", required=True)
p.add_argument("--index-type", help="Elasticsearch index type", required=True)
p.add_argument("--num-shards", help="Number of elasticsearch shards", default=1, type=int)
p.add_argument("--es-block-size", help="Elasticsearch block size to use when exporting", default=200, type=int)
args = p.parse_args()

hl.init(log="/tmp/hail.log")

print("\n=== Importing Hail table ===")

ds = hl.read_table(args.ht_url)

print("\n=== Exporting to Elasticsearch ===")

es = ElasticsearchClient(args.host, args.port)
es.export_table_to_elasticsearch(
    ds,
    index_name=args.index_name,
    index_type_name=args.index_type,
    block_size=args.es_block_size,
    num_shards=args.num_shards,
    delete_index_before_exporting=True,
    export_globals_to_index_meta=True,
    verbose=True,
)

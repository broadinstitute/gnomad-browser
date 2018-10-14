import argparse
import json

import elasticsearch


p = argparse.ArgumentParser()
p.add_argument("--metrics-file", help="Path to metrics JSON file", required=True, type=argparse.FileType("r"))
p.add_argument("--tag", help="Tag metrics with the dataset they belong to", required=True)
p.add_argument("--host", help="Elasticsearch host or IP", required=True)
p.add_argument("--port", help="Elasticsearch port", default=9200, type=int)
p.add_argument("--index-name", help="Elasticsearch index name", required=True)
args = p.parse_args()

es = elasticsearch.Elasticsearch(args.host, port=args.port)

if not es.indices.exists(index=args.index_name):
    mapping = {
        "mappings": {
            "metric": {
                "_all": {"enabled": "false"},
                "properties": {
                    "bin_edges": {"type": "double"},
                    "bin_freq": {"type": "double"},
                    "n_smaller": {"type": "integer"},
                    "n_larger": {"type": "integer"},
                    "metric": {"type": "keyword"},
                    "tag": {"type": "keyword"},
                },
            }
        }
    }
    es.indices.create(index=args.index_name, body=mapping)

metrics = json.loads(args.metrics_file.read())
for metric in metrics:
    metric["tag"] = args.tag

bulk_request = "\n".join([f"{{\"index\": {{}}}}\n{json.dumps(metric)}" for metric in metrics])

es.bulk(body=bulk_request, index=args.index_name, doc_type="metric")

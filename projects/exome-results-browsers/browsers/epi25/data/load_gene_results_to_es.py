import argparse

import hail
from hail.expr import TDouble, TInt, TString

from hail_scripts.v01.utils.elasticsearch_client import ElasticsearchClient


p = argparse.ArgumentParser()
p.add_argument("--host", help="Elasticsearch host or IP", required=True)
p.add_argument("--port", help="Elasticsearch port", default=9200, type=int)
p.add_argument("--num-shards", help="Number of elasticsearch shards", default=2, type=int)
p.add_argument("--block-size", help="Elasticsearch block size to use when exporting", default=1000, type=int)
args = p.parse_args()

hc = hail.HailContext(log="/tmp/hail.log")

gene_results_url = "gs://epi-browser/2018-11-07_epi25-exome-browser-gene-results-table-reduced.csv"

kt = hc.import_table(
    gene_results_url,
    delimiter=",",
    missing="NA",
    quote='"',
    types={
        'gene_name': TString(),
        'description': TString(),
        'gene_id': TString(),
        'xcase_lof': TInt(),
        'xctrl_lof': TInt(),
        'pval_lof': TDouble(),
        'xcase_mpc': TInt(),
        'xctrl_mpc': TInt(),
        'pval_mpc': TDouble(),
        'xcase_infrIndel': TInt(),
        'xctrl_infrIndel': TInt(),
        'pval_infrIndel': TDouble(),
        'pval_meta': TDouble(),
        'analysis_group': TString(),
    }
)

kt = kt.annotate('analysis_group = if (analysis_group == "EE") "DEE" else analysis_group')

es = ElasticsearchClient(args.host, args.port)

es.export_kt_to_elasticsearch(
    kt,
    index_name="epi25_gene_results_181107",
    index_type_name="result",
    block_size=args.block_size,
    num_shards=args.num_shards,
    delete_index_before_exporting=True,
    verbose=True,
)

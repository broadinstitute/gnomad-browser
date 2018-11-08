import argparse

import hail

from hail_scripts.v01.utils.elasticsearch_client import ElasticsearchClient


p = argparse.ArgumentParser()
p.add_argument("--host", help="Elasticsearch host or IP", required=True)
p.add_argument("--port", help="Elasticsearch port", default=9200, type=int)
p.add_argument("--num-shards", help="Number of elasticsearch shards", default=1, type=int)
p.add_argument("--block-size", help="Elasticsearch block size to use when exporting", default=1000, type=int)
args = p.parse_args()

hc = hail.HailContext(log="/tmp/hail.log")

gene_results_url = "gs://schizophrenia-browser/171214/2017-12-13-schema-single-gene-burden-results.kt"

kt = hc.read_table(gene_results_url)

kt = kt.rename({
    'ensembl_gene_id': 'gene_id',
    'Xcase_lof': 'xcase_lof',
    'Xctrl_lof': 'xctrl_lof',
    'Pval_lof': 'pval_lof',
    'Xcase_mpc': 'xcase_mpc',
    'Xctrl_mpc': 'xctrl_mpc',
    'Pval_mpc': 'pval_mpc',
    'Pval_meta': 'pval_meta',
})

kt = kt.annotate("analysis_group = \"all\"")

es = ElasticsearchClient(
    host=args.host,
    port=args.port,
)

es.export_kt_to_elasticsearch(
    kt,
    index_name="schizophrenia_gene_results_171213",
    index_type_name="result",
    block_size=args.block_size,
    num_shards=args.num_shards,
    delete_index_before_exporting=True,
    verbose=True,
)

#!/usr/bin/env python

import argparse
import hail
from hail.expr import TInt, TDouble, TString
from pprint import pprint
from utils.elasticsearch_utils import export_kt_to_elasticsearch

p = argparse.ArgumentParser()
p.add_argument("-H", "--host", help="Elasticsearch node host or IP. To look this up, run: `kubectl describe nodes | grep Addresses`", required=True)
p.add_argument("-p", "--port", help="Elasticsearch port", default=9200, type=int)
p.add_argument("-i", "--index", help="Elasticsearch index name", default="coverage")
p.add_argument("-t", "--index-type", help="Elasticsearch index type", default="position")
p.add_argument("-b", "--block-size", help="Elasticsearch block size", default=100, type=int)
p.add_argument("-s", "--num-shards", help="Number of shards", default=1, type=int)

# parse args
args = p.parse_args()

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

EXAC_COVERAGE_CSV_PATHS = [
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr1.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr10.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr11.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr12.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr13.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr14.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr15.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr16.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr17.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr18.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr19.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr2.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr20.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr21.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr22.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr3.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr4.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr5.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr6.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr7.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr8.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chr9.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chrX.coverage.txt.gz',
    'gs://exac/170122_exacv1_bundle/coverage/Panel.chrY.coverage.txt.gz',
]

types = {
    '#chrom': TString(),
    'pos': TInt(),
    'mean': TDouble(),
    'median': TDouble(),
    '1': TDouble(),
    '5': TDouble(),
    '10': TDouble(),
    '15': TDouble(),
    '20': TDouble(),
    '25': TDouble(),
    '30': TDouble(),
    '50': TDouble(),
    '100': TDouble()
}

kt_coverage = hc.import_table(EXAC_COVERAGE_CSV_PATHS, types=types)
kt_coverage = kt_coverage.rename({
    '#chrom': 'chrom',
    '1': 'over1',
    '5': 'over5',
    '10': 'over10',
    '15': 'over15',
    '20': 'over20',
    '25': 'over25',
    '30': 'over30',
    '50': 'over50',
    '100': 'over100',
})
print(kt_coverage.schema)
print("======== Export exome coverage to elasticsearch ======")
export_kt_to_elasticsearch(
    kt_coverage,
    host=args.host,
    port=args.port,
    index_name=args.index,
    index_type_name=args.index_type,
    num_shards=args.num_shards,
    block_size=args.block_size,
    delete_index_before_exporting=True,
    verbose=True
)

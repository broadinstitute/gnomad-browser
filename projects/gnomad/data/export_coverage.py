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
p.add_argument("-c", "--coverage-type", help="exome/genome/test", default="test")
p.add_argument("-t", "--index-type", help="Elasticsearch index type", default="position")
p.add_argument("-b", "--block-size", help="Elasticsearch block size", default=100, type=int)
p.add_argument("-s", "--num-shards", help="Number of shards", default=1, type=int)

# parse args
args = p.parse_args()

hc = hail.HailContext(log="/hail.log") #, branching_factor=1)

EXOME_COVERAGE_CSV_PATHS = [
    "gs://gnomad-browser/exomes/coverage/exacv2.chr1.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr10.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr11.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr12.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr13.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr14.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr15.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr16.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr17.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr18.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr19.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr2.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr20.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr21.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr22.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr3.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr4.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr5.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr6.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr7.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr8.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chr9.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chrY.cov.txt.gz",
    "gs://gnomad-browser/exomes/coverage/exacv2.chrX.cov.txt.gz",
]

GENOME_COVERAGE_CSV_PATHS = [
    "gs://gnomad-browser/genomes/coverage/Panel.chr1.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr10.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr11.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr12.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr13.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr14.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr15.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr16.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr17.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr18.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr19.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr2.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr20.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr21.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr22.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr3.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr4.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr5.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr6.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr7.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr8.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chr9.genome.coverage.txt.gz",
    "gs://gnomad-browser/genomes/coverage/Panel.chrX.genome.coverage.txt.gz",
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

if args.coverage_type == 'exome':
    COVERAGE_PATHS = EXOME_COVERAGE_CSV_PATHS
if args.coverage_type == 'genome':
    COVERAGE_PATHS = GENOME_COVERAGE_CSV_PATHS
if args.coverage_type == 'test':
    # x chromosome only
    COVERAGE_PATHS = EXOME_COVERAGE_CSV_PATHS[-1]

kt_coverage = hc.import_table(COVERAGE_PATHS, types=types)
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

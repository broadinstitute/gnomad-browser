# Usage:
#
# cd /path/to/hail-elasticsearch-pipelines
# rm hail_scripts.zip
# zip -r hail_scripts.zip hail_scripts
# cd /path/to/gnomadjs/projects/gnomad/data
# cluster start $CLUSTER_NAME
# gcloud dataproc jobs submit pyspark \
#   --cluster=$CLUSTER_NAME \
#   --py-files=/path/to/hail-elasticsearch-pipelines/hail_scripts.zip \
#   ./shape_coverage_summary_for_browser.py -- --input-url=$INPUT_URL --output-url=$OUTPUT_URL
# cluster stop $CLUSTER_NAME
#

import argparse

import hail as hl

from hail_scripts.v02.utils.computed_fields import (
    get_expr_for_contig,
    get_expr_for_start_pos,
    get_expr_for_xpos,
)

p = argparse.ArgumentParser()
p.add_argument("--input-url", help="URL of coverage summary Hail table", required=True)
p.add_argument("--output-url", help="URL to write shaped Hail table to", required=True)
p.add_argument("--subset", help="Filter to this chrom:start-end range")
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.read_table(args.input_url)

if args.subset:
    subset_interval = hl.parse_locus_interval(args.subset)
    ds = ds.filter(subset_interval.contains(ds.locus))

ds = ds.select(
    chrom=get_expr_for_contig(ds),
    pos=get_expr_for_start_pos(ds),
    xpos=get_expr_for_xpos(ds),
    mean=ds.mean,
    median=ds.median,
    over1=ds.over_1,
    over5=ds.over_5,
    over10=ds.over_10,
    over15=ds.over_15,
    over20=ds.over_20,
    over25=ds.over_25,
    over30=ds.over_30,
    over50=ds.over_50,
    over100=ds.over_100,
)

# Drop key for export to ES
ds = ds.order_by("xpos").drop("locus")

#########
# Write #
#########

ds.write(args.output_url)

import argparse

import hail as hl

from hail_scripts.v02.utils.computed_fields import (
    get_expr_for_contig,
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
    chrom=get_expr_for_contig(ds.locus),
    pos=ds.locus.position,
    xpos=get_expr_for_xpos(ds.locus),
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

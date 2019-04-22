import argparse

import hail as hl

p = argparse.ArgumentParser()
p.add_argument("--input-url", required=True)
p.add_argument("--output-url", required=True)
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.read_table(args.input_url)

ds = ds.transmute(description=ds.gene_description)
ds = ds.annotate(analysis_group="meta")

ds.write(args.output_url)

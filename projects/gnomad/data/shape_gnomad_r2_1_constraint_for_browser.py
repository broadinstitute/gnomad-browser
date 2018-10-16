import argparse

import hail as hl

p = argparse.ArgumentParser()
p.add_argument("--input-url", help="URL of constraint Hail table", default="gs://gnomad-public/release/2.1/ht/constraint/constraint.ht")
p.add_argument("--output-url", help="URL to write shaped Hail table to", required=True)
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.read_table(args.input_url)

ds = ds.order_by(ds.transcript)
ds = ds.transmute(gene_name=ds.gene, transcript_id=ds.transcript)

ds.write(args.output_url)

import argparse

import hail as hl

p = argparse.ArgumentParser()
p.add_argument("--input-url", required=True)
p.add_argument("--genes-url", required=True)
p.add_argument("--output-url", required=True)
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.read_table(args.input_url)

ds = ds.annotate(analysis_group="meta")

genes = hl.read_table(args.genes_url)
genes = genes.key_by("gene_id")
ds = ds.annotate(chrom=genes[ds.gene_id].chrom, pos=genes[ds.gene_id].start)

ds.write(args.output_url)

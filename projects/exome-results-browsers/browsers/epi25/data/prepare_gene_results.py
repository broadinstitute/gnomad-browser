import argparse

import hail as hl

p = argparse.ArgumentParser()
p.add_argument("--input-url", required=True)
p.add_argument("--genes-url", required=True)
p.add_argument("--output-url", required=True)
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.import_table(
    args.input_url,
    delimiter=",",
    missing="NA",
    quote='"',
    types={
        "gene_id": hl.tstr,
        "gene_name": hl.tstr,
        "description": hl.tstr,
        "pval_meta": hl.tfloat,
        "analysis_group": hl.tstr,
        # LoF
        "xcase_lof": hl.tint,
        "xctrl_lof": hl.tint,
        "pval_lof": hl.tfloat,
        # MPC
        "xcase_mpc": hl.tint,
        "xctrl_mpc": hl.tint,
        "pval_mpc": hl.tfloat,
        # Inframe indel
        "xcase_infrIndel": hl.tint,
        "xctrl_infrIndel": hl.tint,
        "pval_infrIndel": hl.tfloat,
    },
)

# Rename EE group
ds = ds.annotate(
    analysis_group=hl.cond(ds.analysis_group == "EE", "DEE", ds.analysis_group)
)

# "Meta" p-val was carried over from SCHEMA's data format but isn't descriptive of Epi25
ds = ds.rename({"pval_meta": "pval", "description": "gene_description"})

genes = hl.read_table(args.genes_url)
genes = genes.key_by("gene_id")
ds = ds.annotate(chrom=genes[ds.gene_id].chrom, pos=genes[ds.gene_id].start)

ds.write(args.output_url)

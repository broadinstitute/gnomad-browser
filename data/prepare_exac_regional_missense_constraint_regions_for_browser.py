import argparse
import csv
import tempfile

import hail as hl

from hail_scripts.v02.utils.computed_fields import get_expr_for_xpos


p = argparse.ArgumentParser()
p.add_argument(
    "--input-url", help="URL of regional missense constraint TSV file", required=True
)
p.add_argument("--output-url", help="URL to write output Hail table to", required=True)
args = p.parse_args()


hl.init(log="/tmp/hail.log")

column_types = {
    "transcript": hl.tstr,
    "gene": hl.tstr,
    "chr": hl.tstr,
    "amino_acids": hl.tstr,
    "genomic_start": hl.tint,
    "genomic_end": hl.tint,
    "obs_mis": hl.tfloat,
    "exp_mis": hl.tfloat,
    "obs_exp": hl.tfloat,
    "chisq_diff_null": hl.tfloat,
    "region_name": hl.tstr,
}

ds = hl.import_table(args.input_url, missing="", types=column_types)

###########
# Prepare #
###########

ds = ds.annotate(
    start=hl.min(ds.genomic_start, ds.genomic_end),
    stop=hl.max(ds.genomic_start, ds.genomic_end),
)

ds = ds.annotate(
    xstart=get_expr_for_xpos(hl.locus(ds.chr, ds.start)),
    xstop=get_expr_for_xpos(hl.locus(ds.chr, ds.stop)),
)

ds = ds.drop("genomic_start", "genomic_end")

ds = ds.transmute(
    chrom=ds.chr, gene_name=ds.gene, transcript_id=ds.transcript.split("\.")[0]
)

ds = ds.drop("region_name")

#########
# Write #
#########

ds.write(args.output_url)

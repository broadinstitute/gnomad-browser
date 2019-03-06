import argparse

import hail as hl

p = argparse.ArgumentParser()
p.add_argument(
    "--input-url",
    help="URL of constraint Hail table",
    default="gs://gnomad-public/papers/2019-flagship-lof/v1.0/gnomad.v2.1.1.lof_metrics.by_transcript.ht",
)
p.add_argument("--output-url", help="URL to write output Hail table to", required=True)
args = p.parse_args()

hl.init(log="/tmp/hail.log")

ds = hl.read_table(args.input_url)

# The globals in the Hail table cause a serialization error during Elasticsearch export
ds = ds.select_globals()

population_dict_fields = [
    "pop_no_lofs",
    "pop_obs_het_lof",
    "pop_obs_hom_lof",
    "pop_defined",
    "pop_p",
]

populations = ["afr", "amr", "asj", "eas", "fin", "nfe", "oth", "sas"]

# Convert dicts to structs for Elasticsearch export
ds = ds.annotate(
    **{
        f: hl.struct(**{pop: ds[f][pop] for pop in populations})
        for f in population_dict_fields
    }
)

# Convert interval to struct for Elasticsearch export
ds = ds.annotate(
    interval=hl.struct(
        chrom=ds.interval.start.contig,
        start=ds.interval.start.position,
        end=ds.interval.end.position,
    )
)

ds = ds.key_by()
ds = ds.transmute(gene_name=ds.gene, transcript_id=ds.transcript)

ds.write(args.output_url)

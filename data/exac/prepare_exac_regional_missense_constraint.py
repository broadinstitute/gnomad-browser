import argparse

import hail as hl


COLUMN_TYPES = {
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


def format_regional_missense_constraint(ds):
    ds = ds.annotate(obs_mis=hl.int(ds.obs_mis))

    ds = ds.annotate(start=hl.min(ds.genomic_start, ds.genomic_end), stop=hl.max(ds.genomic_start, ds.genomic_end))

    ds = ds.drop("amino_acids", "chr", "gene", "genomic_start", "genomic_end", "region_name")

    ds = ds.transmute(transcript_id=ds.transcript.split("\\.")[0])

    ds = ds.group_by("transcript_id").aggregate(regions=hl.agg.collect(ds.row_value))

    ds = ds.annotate(regions=hl.sorted(ds.regions, lambda region: region.start))

    return ds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--regional-missense-constraint", help="URL of regional missense constraint TSV file", required=True
    )
    parser.add_argument("--output", help="URL to write output Hail table to", required=True)
    args = parser.parse_args()

    hl.init(log="/tmp/hail.log")

    ds = hl.import_table(args.regional_missense_constraint, missing="", types=COLUMN_TYPES)

    ds = format_regional_missense_constraint(ds)

    ds.write(args.output)


if __name__ == "__main__":
    main()

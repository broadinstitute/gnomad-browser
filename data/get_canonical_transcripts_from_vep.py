import argparse

import hail as hl
import pandas as pd


def get_canonical_transcripts(sites_table):
    return sites_table.aggregate(
        hl.agg.explode(
            lambda csq: hl.agg.collect_as_set((csq.gene_id, csq.transcript_id)),
            sites_table.vep.transcript_consequences.filter(lambda csq: csq.canonical == 1),
        )
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sites_table", nargs="+")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    canonical_transcripts = set()
    for table in args.sites_table:
        canonical_transcripts = canonical_transcripts.union(get_canonical_transcripts(hl.read_table(table)))

    canonical_transcripts = hl.Table.from_pandas(
        pd.DataFrame(
            {"gene_id": gene_id, "transcript_id": transcript_id} for gene_id, transcript_id in canonical_transcripts
        )
    )

    canonical_transcripts.export(args.output)


if __name__ == "__main__":
    main()

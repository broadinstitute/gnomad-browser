import hail as hl
import pandas as pd

from .seeds import SUBSAMPLE_FRACTION, INTEGER


def get_canonical_transcripts(create_test_datasets=False, **sites_table_paths):

    print(f"\n\nGot 'create-test-dataset's?: {create_test_datasets}\n")

    canonical_transcripts = set()
    for path in sites_table_paths.values():
        sites_table = hl.read_table(path)

        # TODO:FIXME:(rgrant) Does this work? Need to keep which gene ID transcripts are kept
        #   in sync. So a simple sample won't work. Maybe run sample a single time on the genes
        #   then transcribe those ENSG-IDs into a single list that all the steps in the Genes
        #   pipeline can filter down to
        if create_test_datasets:
            print(f"\nReceived create test datasets, downsampling table: {path}")
            print(f"\nTable count pre: {sites_table.count()}")
            sites_table = sites_table.sample(SUBSAMPLE_FRACTION, seed=INTEGER)
            print(f"\nTable count post: {sites_table.count()}")

        table_canonical_transcripts = sites_table.aggregate(
            hl.agg.explode(
                lambda csq: hl.agg.collect_as_set((csq.gene_id, csq.transcript_id)),
                sites_table.vep.transcript_consequences.filter(lambda csq: csq.canonical == 1),
            )
        )
        canonical_transcripts = canonical_transcripts.union(table_canonical_transcripts)

    canonical_transcripts = hl.Table.from_pandas(
        pd.DataFrame(
            {"gene_id": gene_id, "canonical_transcript_id": canonical_transcript_id}
            for gene_id, canonical_transcript_id in canonical_transcripts
        ),
        key="gene_id",
    )

    canonical_transcripts = canonical_transcripts.repartition(32, shuffle=True)

    return canonical_transcripts


# ======================================================

# TODO:FIXME: (rgrant): DELETE ME LATER
#   literally just run this locally right here to see if it works

# g37exomes = "gs://gcp-public-data--gnomad/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht"
# g37genomes = "gs://gcp-public-data--gnomad/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht"
# g38genomes = "gs://gcp-public-data--gnomad/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht"

# result = get_canonical_transcripts(create_test_datasets=True, exomes=g37exomes, genomes=g37genomes)
# result = get_canonical_transcripts(create_test_datasets=True, genomes=g38genomes)
# print(f"\n\nCount: {result.count()}\n")
# print(result.show(5))
# result.describe()

# TODO:FIXME: (rgrant) DEBUG:
# print("testing")

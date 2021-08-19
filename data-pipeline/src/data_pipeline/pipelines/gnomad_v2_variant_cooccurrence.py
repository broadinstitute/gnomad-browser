from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v2.gnomad_v2_variant_cooccurrence import prepare_variant_cooccurrence


pipeline = Pipeline()

###############################################
# Variant cooccurrence
###############################################

pipeline.add_task(
    "prepare_variant_cooccurrence",
    prepare_variant_cooccurrence,
    "/gnomad_v2/variant_cooccurrence.ht",
    {"path": "gs://gnomad-public-requester-pays/release/2.1.1/ht/exomes_phased_counts_0.05_3_prime_UTR_variant_vp.ht"},
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

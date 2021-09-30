from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant import annotate_variants, annotate_transcript_consequences

from data_pipeline.datasets.exac.exac_variants import import_exac_vcf

from data_pipeline.pipelines.exac_coverage import pipeline as coverage_pipeline
from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

pipeline.add_task(
    "import_exac_vcf",
    import_exac_vcf,
    "/exac/exac_variants.ht",
    {"path": "gs://gcp-public-data--gnomad/legacy/exac_browser/ExAC.r1.sites.vep.vcf.gz"},
)

pipeline.add_task(
    "annotate_exac_variants",
    annotate_variants,
    "/exac/exac_variants_annotated_1.ht",
    {
        "variants_path": pipeline.get_task("import_exac_vcf"),
        "exome_coverage_path": coverage_pipeline.get_output("exome_coverage"),
    },
)

pipeline.add_task(
    "annotate_exac_transcript_consequences",
    annotate_transcript_consequences,
    "/exac/exac_variants_annotated_2.ht",
    {
        "variants_path": pipeline.get_task("annotate_exac_variants"),
        "transcripts_path": genes_pipeline.get_output("base_transcripts_grch37"),
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"variants": "annotate_exac_transcript_consequences"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

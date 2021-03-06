from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant import annotate_transcript_consequences

from data_pipeline.datasets.exac.exac_coverage import import_exac_coverage
from data_pipeline.datasets.exac.exac_variants import import_exac_vcf

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

###############################################
# Variants
###############################################

pipeline.add_task(
    "import_exac_vcf",
    import_exac_vcf,
    "/exac/exac_variants.ht",
    {"path": "gs://gnomad-public/legacy/exac_browser/ExAC.r1.sites.vep.vcf.gz"},
)

pipeline.add_task(
    "annotate_exac_transcript_consequences",
    annotate_transcript_consequences,
    "/exac/exac_variants_annotated_1.ht",
    {
        "variants_path": pipeline.get_task("import_exac_vcf"),
        "transcripts_path": genes_pipeline.get_task("extract_grch37_transcripts"),
    },
)

###############################################
# Coverage
###############################################

pipeline.add_task(
    "import_exac_coverage", import_exac_coverage, "/exac/exac_coverage.ht",
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

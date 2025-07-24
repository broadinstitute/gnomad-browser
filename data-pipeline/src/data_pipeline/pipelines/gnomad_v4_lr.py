from data_pipeline.pipeline import Pipeline, run_pipeline
from data_pipeline.datasets.gnomad_v4_lr import import_variants_from_vcfs

pipeline = Pipeline()
pipeline.add_task(
    "import_variants_from_vcfs",
    import_variants_from_vcfs,
    "/gnomad_v4_lr/v4_long_reads_variants_1.ht",
    {},
    {
        "vcf_path": "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v2/hgsvc_hprc_chr22.in_silico_predictors.vcf.gz",
        "transcripts_path": "gs://gnomad-v4-data-pipeline/output/v4.1.1/genes/transcripts_grch38_annotated_1.ht",
    },
)

pipeline.set_outputs({"variants": "import_variants_from_vcfs"})

if __name__ == "__main__":
    run_pipeline(pipeline)

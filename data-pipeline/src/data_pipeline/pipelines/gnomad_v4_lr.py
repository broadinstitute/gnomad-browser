from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4_lr import import_variants_from_vcfs

pipeline = Pipeline()
pipeline.add_task(
    "import_variants_from_vcfs",
    import_variants_from_vcfs,
    "/gnomad_v4_lr/v4_long_reads_1.ht",
    {},
    {"vcf_path": ["gs://gnomad-browser-data-pipeline/phil-scratch/gnomAD_LR.chr22.annotated.test_V2.vcf.gz"]},
)

if __name__ == "__main__":
    run_pipeline(pipeline)

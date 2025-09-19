import hail as hl

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.gene import patch_rnu4atac

pipeline = Pipeline()

pipeline.add_task(
    "patch_rnu4atac_grch38",
    patch_rnu4atac,
    "/genes/genes_grch38_patched.ht",
    {"genes_path": "gs://gnomad-v4-data-pipeline/output/genes/genes_grch38_annotated_6.ht"},
)

pipeline.set_outputs({"gene_patches": "patch_rnu4atac_grch38"})

if __name__ == "__main__":
    run_pipeline(pipeline)

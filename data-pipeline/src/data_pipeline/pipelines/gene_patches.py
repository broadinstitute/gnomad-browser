import hail as hl

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.gene import patch_rnu4atac
from data_pipeline.pipelines.genes import pipeline as genes_pipeline

pipeline.add_task(
    "patch_rnu4atac_grch38",
    patch_rnu4atac,
    f"/{genes_subdir}/genes_grch38_patched.ht",
    {"genes_path": genes_pipeline.get_output("genes_grch38")},
)

pipeline.set_outputs({"gene_patches": "patch_rnu4atac_grch38"})

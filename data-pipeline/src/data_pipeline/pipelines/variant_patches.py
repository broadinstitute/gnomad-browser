from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant.patch_rnu4atac_variants import patch_rnu4atac_variants

pipeline = Pipeline()

pipeline.add_task(
    "patch_rnu4atac_variants",
    patch_rnu4atac_variants,
    "/gnomad_v4/gnomad_v4_variants_patched.ht",
    {
        "vepped_path": "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomad_v4.1.RNU4ATAC.vep115.ht",
        "freq_path": "gs://gnomad-v4-data-pipeline/output/gnomad_v4/gnomad_v4_variants_annotated_4.ht",
    },
)

pipeline.set_outputs({"variant_patches": "patch_rnu4atac_variants"})

if __name__ == "__main__":
    run_pipeline(pipeline)

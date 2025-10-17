from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.transcript import extract_transcripts
from data_pipeline.helpers import annotate_table

pipeline = Pipeline()

pipeline.add_task(
    "extract_patched_transcripts",
    extract_transcripts,
    "/transcripts/transcripts_grch38_patched_base.ht",
    {"genes_path": "gs://gnomad-browser-data-pipeline/phil-scratch/output/genes/genes_grch38_patched.ht"},
)

pipeline.add_task(
    "annotate_patched_transcripts",
    annotate_table,
    "/transcripts/transcripts_grch38_annotated_1.ht",
    {
        "table_path": pipeline.get_task("extract_patched_transcripts"),
        "gnomad_constraint": "gs://gnomad-v4-data-pipeline/output/constraint/gnomad_v4_constraint.ht",
    },
)

pipeline.set_outputs({"transcripts_grch38_patched": "annotate_patched_transcripts"})

if __name__ == "__main__":
    run_pipeline(pipeline)

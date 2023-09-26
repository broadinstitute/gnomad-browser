from data_pipeline.config import PipelineConfig
from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_variants import (
    prepare_gnomad_v4_variants,
)

from data_pipeline.data_types.variant import (
    annotate_variants,
    annotate_transcript_consequences,
)

# from data_pipeline.pipelines.gnomad_v4_coverage import pipeline as coverage_pipeline

# from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline(
    config=PipelineConfig.create(name="gnomad_v4_variants", input_root="data_in", output_root="data_out")
)

pipeline.add_task(
    name="prepare_gnomad_v4_exome_variants",
    task_function=prepare_gnomad_v4_variants,
    output_path="/gnomad_v4/gnomad_v4_exome_variants_base.ht",
    inputs={
        "input_path": "external_datasets/mock_v4_release.ht",
    },
)

# pipeline.add_task(
#     name="prepare_gnomad_v4_genome_variants",
#     task_function=prepare_gnomad_v4_variants,
#     output_path="/gnomad_v4/gnomad_v4_genome_variants_base.ht",
#     inputs={
#         "input_path": "external_datasets/mock_v4_release.ht",
#     },
# )

pipeline.add_task(
    name="annotate_gnomad_v4_exome_variants",
    task_function=annotate_variants,
    output_path="/gnomad_v4/gnomad_v4_exome_variants_annotated_1.ht",
    inputs={
        "variants_path": pipeline.get_task("prepare_gnomad_v4_exome_variants"),
        "exome_coverage_path": "tiny_datasets/gnomad_v4_exome_coverage.ht",
        "genome_coverage_path": "tiny_datasets/gnomad_v4_genome_coverage.ht",
        # "exome_coverage_path": coverage_pipeline.get_output("exome_coverage"),
        # "genome_coverage_path": coverage_pipeline.get_output("genome_coverage"),
        # "caids_path": "gs://gnomad-browser-data-pipeline/caids/gnomad_v4_caids.ht",
    },
)

pipeline.add_task(
    name="annotate_gnomad_v4_exome_transcript_consequences",
    task_function=annotate_transcript_consequences,
    output_path="/gnomad_v4/gnomad_v4_variants_annotated_2.ht",
    inputs={
        "variants_path": pipeline.get_task("annotate_gnomad_v4_exome_variants"),
        "transcripts_path": "genes/transcripts_grch38_base.ht",
        "mane_transcripts_path": "genes/mane_select_transcripts.ht"
        # "transcripts_path": genes_pipeline.get_output("base_transcripts_grch38"),
        # "mane_transcripts_path": genes_pipeline.get_output("mane_select_transcripts"),
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"variants": "annotate_gnomad_v4_exome_transcript_consequences"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)
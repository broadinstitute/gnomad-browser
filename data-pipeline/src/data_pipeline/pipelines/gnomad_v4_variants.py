import os
from datetime import datetime
from pathlib import Path
from loguru import logger


from data_pipeline.config import PipelineConfig, get_data_environment, DataEnvironment
from data_pipeline.pipeline import Pipeline, PipelineMock, run_pipeline
from data_pipeline.helpers.write_schemas import write_schemas

from data_pipeline.datasets.gnomad_v4.gnomad_v4_variants import (
    prepare_gnomad_v4_variants,
)


from data_pipeline.pipelines.gnomad_v4_coverage import pipeline as coverage_pipeline
from data_pipeline.pipelines.genes import pipeline as genes_pipeline

from data_pipeline.datasets.gnomad_v4.gnomad_v4_validation import (
    validate_exome_globals_input,
    validate_genome_globals_input,
    validate_exome_variant_input,
    validate_genome_variant_input,
    validate_step1_output,
    validate_step2_output,
    validate_step3_output,
)

from data_pipeline.data_types.variant import (
    annotate_variants,
    annotate_transcript_consequences,
)

RUN = True

pipeline_name = "gnomad_v4_variants"


def generate_iso_timestamp_for_filename():
    now = datetime.utcnow()
    timestamp = now.strftime("%Y%m%dT%H%M%S%Z")
    return timestamp


# output_sub_dir = f"gnomad_v4_{generate_iso_timestamp_for_filename()}"
output_sub_dir = "gnomad_v4_20231027T135454"

config = PipelineConfig(
    name=pipeline_name,
    input_root="gs://gnomad-matt-data-pipeline/2023-10-19/inputs",
    output_root="gs://gnomad-matt-data-pipeline/2023-10-19/outputs",
)


pipeline = Pipeline(config=config)

pipeline.add_task(
    name="prepare_gnomad_v4_variants",
    task_function=prepare_gnomad_v4_variants,
    output_path=f"{output_sub_dir}/gnomad_v4_variants_base.ht",
    inputs={
        "exome_variants_path": "variants/gnomad.exomes.v4.0.sites.pcsk9.ht",
        "genome_variants_path": "variants/gnomad.genomes.v4.0.sites.pcsk9.ht",
    },
)

pipeline.add_task(
    name="annotate_gnomad_v4_variants",
    task_function=annotate_variants,
    output_path=f"{output_sub_dir}/gnomad_v4_variants_annotated_1.ht",
    inputs=(
        {
            "variants_path": pipeline.get_task("prepare_gnomad_v4_variants"),
            "exome_coverage_path": coverage_pipeline.get_output("exome_coverage"),
            "genome_coverage_path": coverage_pipeline.get_output("genome_coverage"),
            # "caids_path": "gs://gnomad-browser-data-pipeline/caids/gnomad_v4_caids.ht",
        }
    ),
)

pipeline.add_task(
    name="annotate_gnomad_v4_transcript_consequences",
    task_function=annotate_transcript_consequences,
    output_path=f"{output_sub_dir}/gnomad_v4_variants_annotated_2.ht",
    inputs={
        "variants_path": pipeline.get_task("annotate_gnomad_v4_variants"),
        "transcripts_path": genes_pipeline.get_output("base_transcripts_grch38"),
        "mane_transcripts_path": genes_pipeline.get_output("mane_select_transcripts"),
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"variants": "annotate_gnomad_v4_transcript_consequences"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    if RUN:
        run_pipeline(pipeline)

        write_schemas(
            [pipeline],
            os.path.join("/home/msolomon", "schemas"),
            task_names=[
                "prepare_gnomad_v4_variants",
                "annotate_gnomad_v4_variants",
                "annotate_gnomad_v4_transcript_consequences",
            ],
        )
        # copy locally using
        # gcloud compute scp dp-m:~/schemas . --tunnel-through-iap --recurse

    logger.info("Validating pipeline IO formats")

    validate_exome_globals_input(pipeline)
    validate_genome_globals_input(pipeline)
    validate_exome_variant_input(pipeline)
    validate_genome_variant_input(pipeline)
    validate_step1_output(pipeline)
    validate_step2_output(pipeline)
    validate_step3_output(pipeline)

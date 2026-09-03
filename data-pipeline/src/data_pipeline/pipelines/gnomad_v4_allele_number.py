from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.allele_number import prepare_allele_number

output_sub_dir = "gnomad_v4_allele_number"

pipeline = Pipeline()

pipeline.add_task(
    name="prepare_gnomad_v4_exome_allele_number",
    task_function=prepare_allele_number,
    output_path=f"/{output_sub_dir}/gnomad_v4_exome_allele_number.ht",
    inputs={
        "allele_number_path": "gs://gcp-public-data--gnomad/release/4.1/ht/exomes/gnomad.exomes.v4.1.allele_number_all_sites.ht",
    },
)

pipeline.add_task(
    name="prepare_gnomad_v4_genome_allele_number",
    task_function=prepare_allele_number,
    output_path=f"/{output_sub_dir}/gnomad_v4_genome_allele_number.ht",
    # Unlike genome coverage -- which v4 inherits from v3.0.1 -- allele number is
    # published for v4.1 genomes directly (N=76,215).
    inputs={
        "allele_number_path": "gs://gcp-public-data--gnomad/release/4.1/ht/genomes/gnomad.genomes.v4.1.allele_number_all_sites.ht",
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs(
    {
        "exome_allele_number": "prepare_gnomad_v4_exome_allele_number",
        "genome_allele_number": "prepare_gnomad_v4_genome_allele_number",
    }
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

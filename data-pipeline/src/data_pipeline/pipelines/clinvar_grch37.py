import hail as hl

from data_pipeline.pipeline import Pipeline, run_pipeline

from data_pipeline.data_types.variant import annotate_transcript_consequences

from data_pipeline.datasets.clinvar import (
    CLINVAR_XML_URL,
    import_clinvar_xml,
    prepare_clinvar_variants,
    annotate_clinvar_variants_in_gnomad,
)

from data_pipeline.pipelines.genes import pipeline as genes_pipeline


pipeline = Pipeline()

pipeline.add_download_task(
    "download_clinvar_xml",
    CLINVAR_XML_URL,
    "/external_sources/clinvar.xml.gz",
)

pipeline.add_task(
    "import_clinvar_xml",
    import_clinvar_xml,
    "/clinvar/clinvar.ht",
    {"clinvar_xml_path": pipeline.get_task("download_clinvar_xml")},
)

pipeline.add_task(
    "prepare_clinvar_grch37_variants",
    prepare_clinvar_variants,
    "/clinvar/clinvar_grch37_base.ht",
    {"clinvar_path": pipeline.get_task("import_clinvar_xml")},
    {"reference_genome": "GRCh37"},
)

pipeline.add_task(
    "vep_clinvar_grch37_variants",
    # tolerate_parse_error to ignore not a number error from "NaN" gene symbol
    lambda path: hl.vep(hl.read_table(path), tolerate_parse_error=True).drop("vep_proc_id"),
    "/clinvar/clinvar_grch37_vepped.ht",
    {"path": pipeline.get_task("prepare_clinvar_grch37_variants")},
)

pipeline.add_task(
    "annotate_clinvar_grch37_transcript_consequences",
    annotate_transcript_consequences,
    "/clinvar/clinvar_grch37_annotated_1.ht",
    {
        "variants_path": pipeline.get_task("vep_clinvar_grch37_variants"),
        "transcripts_path": genes_pipeline.get_output("base_transcripts_grch37"),
    },
)

pipeline.add_task(
    "annotate_clinvar_grch37_variants_in_gnomad",
    annotate_clinvar_variants_in_gnomad,
    "/clinvar/clinvar_grch37_annotated_2.ht",
    {
        "clinvar_path": pipeline.get_task("annotate_clinvar_grch37_transcript_consequences"),
        "gnomad_exome_variants_path": "gs://gcp-public-data--gnomad/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht",
        "gnomad_genome_variants_path": "gs://gcp-public-data--gnomad/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht",
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"clinvar_variants": "annotate_clinvar_grch37_variants_in_gnomad"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

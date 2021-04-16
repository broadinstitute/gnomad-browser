# Run this pipeline with `deployctl elasticsearch load-datasets`

import argparse
import logging
import subprocess
import sys

import hail as hl

from data_pipeline.data_types.variant import compressed_variant_id
from data_pipeline.helpers.elasticsearch_export import export_table_to_elasticsearch
from data_pipeline.pipeline import _pipeline_config

from data_pipeline.pipelines.clinvar_grch37 import pipeline as clinvar_grch37_pipeline
from data_pipeline.pipelines.clinvar_grch38 import pipeline as clinvar_grch38_pipeline
from data_pipeline.pipelines.exac import pipeline as exac_pipeline
from data_pipeline.pipelines.genes import pipeline as genes_pipeline
from data_pipeline.pipelines.gnomad_sv_v2 import pipeline as gnomad_sv_v2_pipeline
from data_pipeline.pipelines.gnomad_v2 import pipeline as gnomad_v2_pipeline
from data_pipeline.pipelines.gnomad_v3 import pipeline as gnomad_v3_pipeline
from data_pipeline.pipelines.liftover import pipeline as liftover_pipeline
from data_pipeline.pipelines.mitochondria import pipeline as mitochondria_pipeline


logger = logging.getLogger("gnomad_data_pipeline")


# Implement this for development/testing purposes
def subset_table(ds):
    return ds


def add_variant_document_id(ds):
    return ds.annotate(document_id=compressed_variant_id(ds.locus, ds.alleles))


def truncate_clinvar_variant_ids(ds):
    return ds.annotate(
        variant_id=hl.if_else(hl.len(ds.variant_id) >= 32_766, ds.variant_id[:32_632] + "...", ds.variant_id)
    )


def add_liftover_document_id(ds):
    return ds.annotate(
        document_id=ds.source.reference_genome[4:] + "-" + compressed_variant_id(ds.source.locus, ds.source.alleles)
    )


DATASETS_CONFIG = {
    ##############################################################################################################
    # Genes
    ##############################################################################################################
    "genes_grch37": {
        "get_table": lambda: hl.read_table(genes_pipeline.get_task("annotate_grch37_genes_step_3").get_output_path()),
        "args": {
            "index": "genes_grch37",
            "index_fields": ["gene_id", "symbol_upper_case", "search_terms", "xstart", "xstop"],
            "id_field": "gene_id",
            "block_size": 200,
        },
    },
    "genes_grch38": {
        "get_table": lambda: hl.read_table(genes_pipeline.get_task("annotate_grch38_genes_step_2").get_output_path()),
        "args": {
            "index": "genes_grch38",
            "index_fields": ["gene_id", "symbol_upper_case", "search_terms", "xstart", "xstop"],
            "id_field": "gene_id",
            "block_size": 200,
        },
    },
    ##############################################################################################################
    # Transcripts
    ##############################################################################################################
    "transcripts_grch37": {
        "get_table": lambda: hl.read_table(genes_pipeline.get_task("annotate_grch37_transcripts").get_output_path()),
        "args": {
            "index": "transcripts_grch37",
            "index_fields": ["transcript_id"],
            "id_field": "transcript_id",
            "block_size": 1_000,
        },
    },
    "transcripts_grch38": {
        "get_table": lambda: hl.read_table(genes_pipeline.get_task("extract_grch38_transcripts").get_output_path()),
        "args": {
            "index": "transcripts_grch38",
            "index_fields": ["transcript_id"],
            "id_field": "transcript_id",
            "block_size": 1_000,
        },
    },
    ##############################################################################################################
    # gnomAD v3
    ##############################################################################################################
    "gnomad_v3_variants": {
        "get_table": lambda: subset_table(
            add_variant_document_id(
                hl.read_table(
                    gnomad_v3_pipeline.get_task("annotate_gnomad_v3_transcript_consequences").get_output_path()
                )
            )
        ),
        "args": {
            "index": "gnomad_v3_variants",
            "index_fields": [
                "document_id",
                "variant_id",
                "rsids",
                "locus",
                "transcript_consequences.gene_id",
                "transcript_consequences.transcript_id",
            ],
            "id_field": "document_id",
            "num_shards": 48,
            "block_size": 1_000,
        },
    },
    "gnomad_v3_genome_coverage": {
        "get_table": lambda: subset_table(
            hl.read_table(gnomad_v3_pipeline.get_task("prepare_gnomad_v3_coverage").get_output_path())
        ),
        "args": {"index": "gnomad_v3_genome_coverage", "id_field": "xpos", "num_shards": 48, "block_size": 10_000},
    },
    ##############################################################################################################
    # v3 mitochondria
    ##############################################################################################################
    "gnomad_v3_mitochondrial_variants": {
        "get_table": lambda: subset_table(
            add_variant_document_id(
                hl.read_table(
                    mitochondria_pipeline.get_task(
                        "annotate_mitochondrial_variant_transcript_consequences"
                    ).get_output_path()
                )
            )
        ),
        "args": {
            "index": "gnomad_v3_mitochondrial_variants",
            "index_fields": [
                "document_id",
                "variant_id",
                "rsid",
                "locus",
                "transcript_consequences.gene_id",
                "transcript_consequences.transcript_id",
            ],
            "id_field": "document_id",
            "num_shards": 1,
            "block_size": 1_000,
        },
    },
    "gnomad_v3_mitochondrial_coverage": {
        "get_table": lambda: subset_table(
            hl.read_table(mitochondria_pipeline.get_task("prepare_mitochondrial_coverage").get_output_path())
        ),
        "args": {
            "index": "gnomad_v3_mitochondrial_coverage",
            "id_field": "xpos",
            "num_shards": 1,
            "block_size": 10_000,
        },
    },
    ##############################################################################################################
    # gnomAD SV v2
    ##############################################################################################################
    "gnomad_structural_variants_v2": {
        "get_table": lambda: hl.read_table(
            gnomad_sv_v2_pipeline.get_task("prepare_structural_variants").get_output_path()
        ),
        "args": {
            "index": "gnomad_structural_variants_v2",
            "index_fields": ["variant_id", "xpos", "xend", "xpos2", "xend2", "genes"],
            "id_field": "variant_id",
            "num_shards": 2,
            "block_size": 1_000,
        },
    },
    ##############################################################################################################
    # gnomAD v2
    ##############################################################################################################
    "gnomad_v2_variants": {
        "get_table": lambda: subset_table(
            add_variant_document_id(
                hl.read_table(
                    gnomad_v2_pipeline.get_task("annotate_gnomad_v2_transcript_consequences").get_output_path()
                )
            )
        ),
        "args": {
            "index": "gnomad_v2_variants",
            "index_fields": [
                "document_id",
                "variant_id",
                "rsids",
                "locus",
                "transcript_consequences.gene_id",
                "transcript_consequences.transcript_id",
            ],
            "id_field": "document_id",
            "num_shards": 48,
            "block_size": 1_000,
        },
    },
    "gnomad_v2_exome_coverage": {
        "get_table": lambda: subset_table(
            hl.read_table(gnomad_v2_pipeline.get_task("prepare_gnomad_v2_exome_coverage").get_output_path())
        ),
        "args": {"index": "gnomad_v2_exome_coverage", "id_field": "xpos", "num_shards": 48, "block_size": 10_000},
    },
    "gnomad_v2_genome_coverage": {
        "get_table": lambda: subset_table(
            hl.read_table(gnomad_v2_pipeline.get_task("prepare_gnomad_v2_genome_coverage").get_output_path())
        ),
        "args": {"index": "gnomad_v2_genome_coverage", "id_field": "xpos", "num_shards": 48, "block_size": 10_000},
    },
    "gnomad_v2_mnvs": {
        "get_table": lambda: hl.read_table(gnomad_v2_pipeline.get_task("prepare_gnomad_v2_mnvs").get_output_path()),
        "args": {
            "index": "gnomad_v2_mnvs",
            "index_fields": ["variant_id"],
            "id_field": "variant_id",
            "num_shards": 1,
            "block_size": 1_000,
        },
    },
    "gnomad_v2_lof_curation_results": {
        "get_table": lambda: add_variant_document_id(
            hl.read_table(gnomad_v2_pipeline.get_task("prepare_gnomad_v2_lof_curation_results").get_output_path())
        ),
        "args": {
            "index": "gnomad_v2_lof_curation_results",
            "index_fields": ["document_id", "variant_id", "locus", "lof_curations.gene_id"],
            "id_field": "document_id",
            "num_shards": 1,
            "block_size": 1_000,
        },
    },
    ##############################################################################################################
    # ExAC
    ##############################################################################################################
    "exac_variants": {
        "get_table": lambda: subset_table(
            add_variant_document_id(
                hl.read_table(exac_pipeline.get_task("annotate_exac_transcript_consequences").get_output_path())
            )
        ),
        "args": {
            "index": "exac_variants",
            "index_fields": [
                "document_id",
                "variant_id",
                "rsids",
                "locus",
                "transcript_consequences.gene_id",
                "transcript_consequences.transcript_id",
            ],
            "id_field": "document_id",
            "num_shards": 16,
            "block_size": 1_000,
        },
    },
    "exac_exome_coverage": {
        "get_table": lambda: subset_table(
            hl.read_table(exac_pipeline.get_task("import_exac_coverage").get_output_path())
        ),
        "args": {"index": "exac_exome_coverage", "id_field": "xpos", "num_shards": 16, "block_size": 10_000},
    },
    ##############################################################################################################
    # ClinVar
    ##############################################################################################################
    "clinvar_grch38_variants": {
        "get_table": lambda: truncate_clinvar_variant_ids(
            subset_table(
                hl.read_table(
                    clinvar_grch38_pipeline.get_task("annotate_clinvar_grch38_variants_in_gnomad").get_output_path()
                )
            )
        ),
        "args": {
            "index": "clinvar_grch38_variants",
            "id_field": "clinvar_variation_id",
            "index_fields": [
                "clinvar_variation_id",
                "variant_id",
                "chrom",
                "pos",
                "transcript_consequences.gene_id",
                "transcript_consequences.transcript_id",
            ],
            "num_shards": 2,
            "block_size": 2_000,
        },
    },
    "clinvar_grch37_variants": {
        "get_table": lambda: truncate_clinvar_variant_ids(
            subset_table(
                hl.read_table(
                    clinvar_grch37_pipeline.get_task("annotate_clinvar_grch37_variants_in_gnomad").get_output_path()
                )
            )
        ),
        "args": {
            "index": "clinvar_grch37_variants",
            "id_field": "clinvar_variation_id",
            "index_fields": [
                "clinvar_variation_id",
                "variant_id",
                "chrom",
                "pos",
                "transcript_consequences.gene_id",
                "transcript_consequences.transcript_id",
            ],
            "num_shards": 2,
            "block_size": 2_000,
        },
    },
    ##############################################################################################################
    # Liftover
    ##############################################################################################################
    "liftover": {
        "get_table": lambda: add_liftover_document_id(
            hl.read_table(liftover_pipeline.get_task("prepare_liftover").get_output_path())
        ),
        "args": {
            "index": "liftover",
            # "index_fields": [] # Index all fields
            "id_field": "document_id",
            "num_shards": 8,
            "block_size": 1_000,
        },
    },
}


def export_datasets(elasticsearch_host, elasticsearch_auth, datasets):
    base_args = {
        "host": elasticsearch_host,
        "auth": elasticsearch_auth,
    }

    for dataset in datasets:
        logger.info("exporting dataset %s", dataset)
        dataset_config = DATASETS_CONFIG[dataset]
        table = dataset_config["get_table"]()
        export_table_to_elasticsearch(table, **base_args, **dataset_config.get("args", {}))


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True)
    parser.add_argument("--secret", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--datasets", required=True)
    args = parser.parse_args(argv)

    # TODO: clean this up
    _pipeline_config["output_root"] = args.output_root.rstrip("/")

    elasticsearch_password = subprocess.check_output(
        ["gcloud", "secrets", "versions", "access", "latest", f"--secret={args.secret}"]
    ).decode("utf8")

    datasets = args.datasets.split(",")
    unknown_datasets = [d for d in datasets if d not in DATASETS_CONFIG.keys()]
    if unknown_datasets:
        raise RuntimeError(f"Unknown datasets: {', '.join(unknown_datasets)}")

    export_datasets(
        elasticsearch_host=args.host, elasticsearch_auth=("elastic", elasticsearch_password), datasets=datasets
    )


if __name__ == "__main__":
    main(sys.argv[1:])

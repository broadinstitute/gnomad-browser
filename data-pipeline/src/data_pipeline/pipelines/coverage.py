from data_pipeline.config import config
from data_pipeline.pipeline import Pipeline, parse_pipeline_args

from data_pipeline.coverage.coverage import prepare_coverage, prepare_feature_coverage_buckets, prepare_feature_coverage
from data_pipeline.coverage.exac_coverage import import_exac_coverage

from data_pipeline.pipelines.gene_models import gene_models_pipeline


staging_path = config.staging_path.rstrip("/")

coverage_pipeline = Pipeline()

###############################################
# Buckets
###############################################

coverage_pipeline.add_task(
    "prepare_grch38_gene_coverage_buckets",
    prepare_feature_coverage_buckets,
    staging_path + "/coverage/gene_buckets_grch38.ht",
    {"genes_or_transcripts_path": gene_models_pipeline.get_task("prepare_grch38_gene_models").output_path},
    {"reference_genome": "GRCh38"},
)

coverage_pipeline.add_task(
    "prepare_grch38_transcript_coverage_buckets",
    prepare_feature_coverage_buckets,
    staging_path + "/coverage/transcript_buckets_grch38.ht",
    {"genes_or_transcripts_path": gene_models_pipeline.get_task("extract_grch38_transcripts").output_path},
    {"reference_genome": "GRCh38"},
)

coverage_pipeline.add_task(
    "prepare_grch37_gene_coverage_buckets",
    prepare_feature_coverage_buckets,
    staging_path + "/coverage/gene_buckets_grch37.ht",
    {"genes_or_transcripts_path": gene_models_pipeline.get_task("prepare_grch37_gene_models").output_path},
    {"reference_genome": "GRCh37"},
)

coverage_pipeline.add_task(
    "prepare_grch37_transcript_coverage_buckets",
    prepare_feature_coverage_buckets,
    staging_path + "/coverage/transcript_buckets_grch37.ht",
    {"genes_or_transcripts_path": gene_models_pipeline.get_task("extract_grch37_transcripts").output_path},
    {"reference_genome": "GRCh37"},
)

###############################################
# gnomAD v3
###############################################

coverage_pipeline.add_task(
    "prepare_gnomad_v3_coverage",
    prepare_coverage,
    staging_path + "/coverage/gnomad_v3_genome_coverage.ht",
    {
        "coverage_path": "gs://gnomad-public-requester-pays/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.ht"
    },
)

coverage_pipeline.add_task(
    "prepare_gnomad_v3_gene_coverage",
    prepare_feature_coverage,
    staging_path + "/coverage/gnomad_v3_gene_coverage.ht",
    {
        "bucket_loci_path": coverage_pipeline.get_task("prepare_grch38_gene_coverage_buckets").output_path,
        "genome_coverage_path": coverage_pipeline.get_task("prepare_gnomad_v3_coverage").output_path,
    },
)

coverage_pipeline.add_task(
    "prepare_gnomad_v3_transcript_coverage",
    prepare_feature_coverage,
    staging_path + "/coverage/gnomad_v3_transcript_coverage.ht",
    {
        "bucket_loci_path": coverage_pipeline.get_task("prepare_grch38_transcript_coverage_buckets").output_path,
        "genome_coverage_path": coverage_pipeline.get_task("prepare_gnomad_v3_coverage").output_path,
    },
)

###############################################
# gnomAD v2
###############################################

coverage_pipeline.add_task(
    "prepare_gnomad_v2_exome_coverage",
    prepare_coverage,
    staging_path + "/coverage/gnomad_v2_exome_coverage.ht",
    {"coverage_path": "gs://gnomad-public-requester-pays/release/2.1/coverage/exomes/gnomad.exomes.r2.1.coverage.ht"},
)

coverage_pipeline.add_task(
    "prepare_gnomad_v2_genome_coverage",
    prepare_coverage,
    staging_path + "/coverage/gnomad_v2_genome_coverage.ht",
    {
        "coverage_path": "gs://gnomad-public-requester-pays/release/2.1/coverage/genomes/gnomad.genomes.r2.1.coverage.ht",
    },
)

coverage_pipeline.add_task(
    "prepare_gnomad_v2_gene_coverage",
    prepare_feature_coverage,
    staging_path + "/coverage/gnomad_v2_gene_coverage.ht",
    {
        "bucket_loci_path": coverage_pipeline.get_task("prepare_grch37_gene_coverage_buckets").output_path,
        "exome_coverage_path": coverage_pipeline.get_task("prepare_gnomad_v2_exome_coverage").output_path,
        "genome_coverage_path": coverage_pipeline.get_task("prepare_gnomad_v2_genome_coverage").output_path,
    },
)

coverage_pipeline.add_task(
    "prepare_gnomad_v2_transcript_coverage",
    prepare_feature_coverage,
    staging_path + "/coverage/gnomad_v2_transcript_coverage.ht",
    {
        "bucket_loci_path": coverage_pipeline.get_task("prepare_grch37_transcript_coverage_buckets").output_path,
        "exome_coverage_path": coverage_pipeline.get_task("prepare_gnomad_v2_exome_coverage").output_path,
        "genome_coverage_path": coverage_pipeline.get_task("prepare_gnomad_v2_genome_coverage").output_path,
    },
)

###############################################
# ExAC
###############################################

coverage_pipeline.add_task(
    "import_exac_coverage", import_exac_coverage, staging_path + "/coverage/exac_coverage.ht",
)

coverage_pipeline.add_task(
    "prepare_exac_gene_coverage",
    prepare_feature_coverage,
    staging_path + "/coverage/exac_gene_coverage.ht",
    {
        "bucket_loci_path": coverage_pipeline.get_task("prepare_grch37_gene_coverage_buckets").output_path,
        "exome_coverage_path": coverage_pipeline.get_task("import_exac_coverage").output_path,
    },
)

coverage_pipeline.add_task(
    "prepare_exac_transcript_coverage",
    prepare_feature_coverage,
    staging_path + "/coverage/exac_transcript_coverage.ht",
    {
        "bucket_loci_path": coverage_pipeline.get_task("prepare_grch37_transcript_coverage_buckets").output_path,
        "exome_coverage_path": coverage_pipeline.get_task("import_exac_coverage").output_path,
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    args = parse_pipeline_args(coverage_pipeline)

    import hail as hl

    hl.init()

    coverage_pipeline.run(**args)

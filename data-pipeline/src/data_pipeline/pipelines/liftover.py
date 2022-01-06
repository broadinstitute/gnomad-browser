import hail as hl

from data_pipeline.data_types.variant import variant_id

from data_pipeline.pipeline import Pipeline, run_pipeline


pipeline = Pipeline()

###############################################
# Liftover
###############################################


def prepare_gnomad_v2_liftover(
    gnomad_v2_liftover_exomes_path, gnomad_v2_liftover_genomes_path, gnomad_v3_variants_path
):
    exome_liftover = hl.read_table(gnomad_v2_liftover_exomes_path)
    exome_liftover = exome_liftover.select(
        exome=hl.struct(original_locus=exome_liftover.original_locus, original_alleles=exome_liftover.original_alleles)
    )
    genome_liftover = hl.read_table(gnomad_v2_liftover_genomes_path).select("original_locus", "original_alleles")
    genome_liftover = genome_liftover.select(
        genome=hl.struct(
            original_locus=genome_liftover.original_locus, original_alleles=genome_liftover.original_alleles
        )
    )

    ds = exome_liftover.join(genome_liftover, "outer")
    ds = ds.transmute(**hl.or_else(ds.exome, ds.genome))

    ds = ds.select_globals()
    ds = ds.key_by()

    ds = ds.rename({"locus": "liftover_locus", "alleles": "liftover_alleles"})

    ds = ds.select(
        source=hl.struct(
            variant_id=variant_id(ds.original_locus, ds.original_alleles),
            locus=ds.original_locus,
            alleles=ds.original_alleles,
            reference_genome=ds.original_locus.dtype.reference_genome.name,
        ),
        liftover=hl.struct(
            variant_id=variant_id(ds.liftover_locus, ds.liftover_alleles),
            locus=ds.liftover_locus,
            alleles=ds.liftover_alleles,
            reference_genome=ds.liftover_locus.dtype.reference_genome.name,
        ),
        datasets=hl.set(["gnomad_r2_1"]),
    )

    gnomad_v3_variants = hl.read_table(gnomad_v3_variants_path)
    ds = ds.annotate(
        datasets=hl.if_else(
            hl.is_defined(gnomad_v3_variants[ds.liftover.locus, ds.liftover.alleles]),
            ds.datasets.add("gnomad_r3"),
            ds.datasets,
        )
    )

    return ds


pipeline.add_task(
    "prepare_liftover",
    prepare_gnomad_v2_liftover,
    "/liftover.ht",
    {
        "gnomad_v2_liftover_exomes_path": "gs://gcp-public-data--gnomad/release/2.1.1/liftover_grch38/ht/exomes/gnomad.exomes.r2.1.1.sites.liftover_grch38.ht",
        "gnomad_v2_liftover_genomes_path": "gs://gcp-public-data--gnomad/release/2.1.1/liftover_grch38/ht/genomes/gnomad.genomes.r2.1.1.sites.liftover_grch38.ht",
        "gnomad_v3_variants_path": "gs://gcp-public-data--gnomad/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht",
    },
)

###############################################
# Outputs
###############################################

pipeline.set_outputs({"liftover": "prepare_liftover"})

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

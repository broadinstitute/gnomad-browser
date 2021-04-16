import hail as hl
from hail.genetics import reference_genome

from data_pipeline.data_types.variant import variant_id

from data_pipeline.pipeline import Pipeline, run_pipeline


pipeline = Pipeline()

###############################################
# Liftover
###############################################


def prepare_gnomad_v2_liftover(gnomad_v2_liftover_path, gnomad_v3_variants_path):
    ds = hl.read_table(gnomad_v2_liftover_path)

    ds = ds.filter(hl.is_defined(ds.liftover_locus) & hl.is_defined(ds.liftover_alleles))

    ds = ds.key_by()

    ds = ds.select(
        source=hl.struct(
            variant_id=variant_id(ds.locus, ds.alleles),
            locus=ds.locus,
            alleles=ds.alleles,
            reference_genome=ds.locus.dtype.reference_genome.name,
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
        "gnomad_v2_liftover_path": "gs://gnomad-browser/gnomad-liftover/output.ht",
        "gnomad_v3_variants_path": "gs://gnomad-public-requester-pays/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht",
    },
)

###############################################
# Run
###############################################

if __name__ == "__main__":
    run_pipeline(pipeline)

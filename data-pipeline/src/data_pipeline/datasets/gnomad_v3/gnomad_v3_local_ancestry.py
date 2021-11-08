import hail as hl

from data_pipeline.data_types.variant import variant_id


def prepare_local_ancestry(path):
    ds = hl.import_vcf(path, reference_genome="GRCh38", min_partitions=2000).rows()

    ds = ds.select(
        variant_id=variant_id(ds.locus, ds.alleles),
        populations=hl.struct(
            genome=[
                hl.struct(id=f"amr_{key}", ac=ds.info[f"AC_{vcf_key}"], an=ds.info[f"AN_{vcf_key}"])
                for key, vcf_key in [
                    ("african", "Africa"),
                    ("amerindigenous", "Amerindigenous"),
                    ("european", "Europe"),
                ]
            ],
        ),
    )

    return ds

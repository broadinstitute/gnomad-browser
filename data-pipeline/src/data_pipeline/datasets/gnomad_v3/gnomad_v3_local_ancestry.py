import hail as hl

from data_pipeline.data_types.variant import variant_id


def prepare_local_ancestry(sources):
    result = None

    for source in sources:
        path = source["path"]
        ancestry_group_id = source["ancestry_group_id"]
        local_ancestry_group_keys = source["local_ancestry_group_keys"]

        ds = hl.import_vcf(path, reference_genome="GRCh38", min_partitions=2000).rows()

        ds = ds.select(
            variant_id=variant_id(ds.locus, ds.alleles),
            populations=hl.struct(
                genome=hl.array(
                    [
                        hl.struct(
                            id=f"{ancestry_group_id}_{key}", ac=ds.info[f"AC_{vcf_key}"], an=ds.info[f"AN_{vcf_key}"]
                        )
                        for key, vcf_key in local_ancestry_group_keys
                    ]
                ),
            ),
        )
        ds = ds.key_by(ds.variant_id)

        if result is None:
            result = ds
        else:
            result = result.transmute(
                populations=hl.struct(genome=result.populations.genome.extend(ds[result.variant_id].populations.genome))
            )

    return result

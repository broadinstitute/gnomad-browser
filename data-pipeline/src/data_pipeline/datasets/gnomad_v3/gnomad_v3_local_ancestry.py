import hail as hl

from data_pipeline.data_types.variant import variant_id

data_item = hl.tstruct(id=hl.tstr, ac=hl.tint32, an=hl.tint32)
data_array = hl.tarray(data_item)


def prepare_local_ancestry(sources):
    result = None

    for source in sources:
        path = source["path"]
        ancestry_group_id = source["ancestry_group_id"]
        local_ancestry_group_keys = source["local_ancestry_group_keys"]

        ds = hl.import_vcf(path, reference_genome="GRCh38", min_partitions=2000).rows()

        ds = ds.select(
            variant_id=variant_id(ds.locus, ds.alleles),
            genome=hl.array(
                [
                    hl.struct(id=f"{ancestry_group_id}_{key}", ac=ds.info[f"AC_{vcf_key}"], an=ds.info[f"AN_{vcf_key}"])
                    for key, vcf_key in local_ancestry_group_keys
                ]
            ),
        )
        ds = ds.key_by(ds.variant_id)
        ds = ds.select(ds.genome, ds.locus, ds.alleles)

        if result is None:
            result = ds
        else:
            result = result.join(ds, how="outer")
            result = result.transmute(
                genome=hl.or_else(result.genome, hl.literal([], dtype=data_array)),
                genome_1=hl.or_else(result.genome_1, hl.literal([], dtype=data_array)),
                locus=hl.or_else(result.locus, result.locus_1),
                alleles=hl.or_else(result.alleles, result.alleles_1),
            )
            result = result.transmute(
                genome=result.genome.extend(result.genome_1),
            )

    shaped_result = result.transmute(populations=hl.struct(genome=result.genome))
    return shaped_result

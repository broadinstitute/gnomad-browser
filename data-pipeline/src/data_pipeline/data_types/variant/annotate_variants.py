import hail as hl


def annotate_variants(variants_path, exome_coverage_path=None, genome_coverage_path=None):
    ds = hl.read_table(variants_path)

    ds = ds.annotate(coverage=hl.struct())
    if exome_coverage_path:
        exome_coverage = hl.read_table(exome_coverage_path)
        ds = ds.annotate(coverage=ds.coverage.annotate(exome=exome_coverage[ds.locus]))
    if genome_coverage_path:
        genome_coverage = hl.read_table(genome_coverage_path)
        ds = ds.annotate(coverage=ds.coverage.annotate(genome=genome_coverage[ds.locus]))

    return ds


def annotate_caids(variants_path, caids_path=None):
    ds = hl.read_table(variants_path)

    if caids_path:
        caids = hl.read_table(caids_path)
        ds = ds.annotate(caid=caids[ds.key].caid)

    return ds


def annotate_vrs_ids(variants_path, exome_variants_path, genome_variants_path):
    ds = hl.read_table(variants_path)
    exomes = hl.read_table(exome_variants_path)
    genomes = hl.read_table(genome_variants_path)
    exome_vrs = exomes.select(vrs=exomes.info.vrs)
    genome_vrs = genomes.select(vrs=genomes.info.vrs)
    vrs = exome_vrs.union(genome_vrs)
    vrs = vrs.group_by(vrs.locus, vrs.alleles).aggregate(vrs=hl.agg.collect(vrs.vrs)[0])
    vrs = vrs.transmute(
        vrs=hl.struct(
            ref=hl.struct(
                allele_id=vrs.vrs.VRS_Allele_IDs[0],
                start=vrs.vrs.VRS_Starts[0],
                end=vrs.vrs.VRS_Ends[0],
                state=vrs.vrs.VRS_States[0],
            ),
            alt=hl.struct(
                allele_id=vrs.vrs.VRS_Allele_IDs[1],
                start=vrs.vrs.VRS_Starts[1],
                end=vrs.vrs.VRS_Ends[1],
                state=vrs.vrs.VRS_States[1],
            ),
        )
    )
    ds = ds.join(vrs)
    return ds

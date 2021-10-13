import hail as hl


def annotate_variants(variants_path, exome_coverage_path=None, genome_coverage_path=None, caids_path=None):
    ds = hl.read_table(variants_path)

    ds = ds.annotate(coverage=hl.struct())
    if exome_coverage_path:
        exome_coverage = hl.read_table(exome_coverage_path)
        ds = ds.annotate(coverage=ds.coverage.annotate(exome=exome_coverage[ds.locus].drop("xpos")))
    if genome_coverage_path:
        genome_coverage = hl.read_table(genome_coverage_path)
        ds = ds.annotate(coverage=ds.coverage.annotate(genome=genome_coverage[ds.locus].drop("xpos")))

    if caids_path:
        caids = hl.read_table(caids_path)
        ds = ds.annotate(caid=caids[ds.key].caid)

    return ds

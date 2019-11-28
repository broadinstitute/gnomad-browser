import hail as hl


def normalized_contig(locus: hl.expr.LocusExpression) -> hl.expr.StringExpression:
    """
    Normalized contig name
    """
    return locus.contig.replace("^chr", "")


def variant_id(locus: hl.expr.LocusExpression, alleles: hl.expr.ArrayExpression, max_length: int = None):
    """
    Expression for computing <chrom>-<pos>-<ref>-<alt>. Assumes alleles were split.

    Args:
        max_length: (optional) length at which to truncate the <chrom>-<pos>-<ref>-<alt> string

    Return:
        string: "<chrom>-<pos>-<ref>-<alt>"
    """
    contig = normalized_contig(locus)
    var_id = contig + "-" + hl.str(locus.position) + "-" + alleles[0] + "-" + alleles[1]

    if max_length is not None:
        return var_id[0:max_length]

    return var_id


def variant_ids(
    locus: hl.expr.LocusExpression, alleles: hl.expr.ArrayExpression, max_length: int = None
) -> hl.expr.ArrayExpression:
    """
    Return a list of variant ids - one for each alt allele in the variant
    """

    def compute_variant_id(alt):
        var_id = normalized_contig(locus) + "-" + hl.str(locus.position) + "-" + alleles[0] + "-" + alt

        if max_length is not None:
            var_id = var_id[:max_length]

        return var_id

    return alleles[1:].map(compute_variant_id)


def contig_number(locus: hl.expr.LocusExpression) -> hl.expr.Int32Expression:
    """
    Convert contig name to contig number
    """
    return hl.bind(
        lambda contig: (
            hl.case().when(contig == "X", 23).when(contig == "Y", 24).when(contig[0] == "M", 25).default(hl.int(contig))
        ),
        normalized_contig(locus),
    )


def x_position(locus: hl.expr.LocusExpression) -> hl.expr.Int64Expression:
    """
    Genomic position represented as a single number = contig_number * 10**9 + position.
    This represents chrom:pos more compactly and allows for easier sorting.
    """
    return hl.int64(contig_number(locus)) * 1_000_000_000 + locus.position

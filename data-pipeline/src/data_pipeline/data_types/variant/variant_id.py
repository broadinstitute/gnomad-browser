import hail as hl

from data_pipeline.data_types.locus import normalized_contig


def variant_id(locus: hl.expr.LocusExpression, alleles: hl.expr.ArrayExpression, max_length: int = None):
    """
    Expression for computing <chrom>-<pos>-<ref>-<alt>. Assumes alleles were split.

    Args:
        max_length: (optional) length at which to truncate the <chrom>-<pos>-<ref>-<alt> string

    Return:
        string: "<chrom>-<pos>-<ref>-<alt>"
    """
    contig = normalized_contig(locus.contig)
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
        return hl.rbind(
            hl.min_rep(locus, [alleles[0], alt]), lambda min_rep: variant_id(min_rep.locus, min_rep.alleles, max_length)
        )

    return alleles[1:].map(compute_variant_id)

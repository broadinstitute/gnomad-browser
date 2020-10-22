import string

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


_ENCODED_ALLELE_CHARACTERS = hl.array(list(string.ascii_uppercase + string.ascii_lowercase + string.digits + "-_"))


def _grouped(arr: hl.expr.ArrayExpression, group_size: hl.expr.Int32Expression) -> hl.expr.ArrayExpression:
    return hl.range(0, hl.len(arr), group_size).map(lambda i: arr[i : i + group_size])


def _encode_allele(allele: hl.expr.StringExpression) -> hl.expr.StringExpression:
    return hl.delimit(
        _grouped(
            # Convert string to array
            allele.split("")[:-1]
            # Convert letters to numbers
            .map(lambda letter: hl.switch(letter).when("A", 0).when("C", 1).when("G", 2).when("T", 3).or_missing()),
            3,  # Group into sets of 3
        )
        # Ensure each group has 3 elements
        .map(lambda g: g.extend(hl.range(3 - hl.len(g)).map(lambda _: 0)))
        # Bit shift and add group elements
        .map(lambda g: g[0] * 16 + g[1] * 4 + g[2])
        # Convert to letters
        .map(lambda n: _ENCODED_ALLELE_CHARACTERS[n]),
        "",
    )


def compressed_variant_id(locus: hl.expr.LocusExpression, alleles: hl.expr.ArrayExpression) -> hl.expr.StringExpression:
    return hl.rbind(
        hl.len(alleles[0]),
        hl.len(alleles[1]),
        lambda ref_len, alt_len: hl.case()
        .when(
            ref_len > alt_len,
            normalized_contig(locus.contig)
            + "-"
            + hl.str(locus.position)
            + "d"
            + hl.str(ref_len - alt_len)
            + "-"
            + alleles[1],
        )
        .when(
            ref_len < alt_len,
            normalized_contig(locus.contig)
            + "-"
            + hl.str(locus.position)
            + "i"
            + hl.str(alt_len - ref_len)
            + "-"
            + _encode_allele(alleles[1]),
        )
        .default(variant_id(locus, alleles)),
    )

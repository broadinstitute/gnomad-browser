from typing import Dict, List, Optional

import hail as hl

from data_pipeline.data_types.locus import x_position

# Classes of contig that differ in how many alleles a sample can contribute.
# Anything not called out here is diploid in every sample: the autosomes, and
# the pseudoautosomal regions of chrX.
AUTOSOMAL = "autosomal"
X_NON_PAR = "X_non_par"
Y_NON_PAR = "Y_non_par"
Y_PAR = "Y_par"
MITOCHONDRIAL = "mitochondrial"


def max_allele_number(contig_class: str, n_xx: int, n_xy: int) -> int:
    """The allele number a site would have if every sample were called there.

    This is the denominator of the call rate. It depends on ploidy: XY samples
    are haploid outside the pseudoautosomal regions of chrX and chrY, only XY
    samples contribute anything on chrY, and the mitochondrion is haploid in
    everyone.
    """
    if contig_class == AUTOSOMAL:
        return 2 * (n_xx + n_xy)
    if contig_class == X_NON_PAR:
        return 2 * n_xx + n_xy
    if contig_class == Y_NON_PAR:
        return n_xy
    if contig_class == Y_PAR:
        return 2 * n_xy
    if contig_class == MITOCHONDRIAL:
        return n_xx + n_xy
    raise ValueError(f"Unknown contig class {contig_class}")


def _stratum_index(strata_meta: List[Dict[str, str]], keys: Dict[str, str]) -> int:
    """The position of the stratum described exactly by ``keys``.

    ``AN`` is an array parallel to the ``strata_meta`` global, so a stratum is
    addressed by position. Matching on equality rather than containment matters:
    ``{"group": "adj"}`` is contained in every ancestry- and sex-stratified
    entry, so a containment match would return the first of hundreds of strata
    instead of the whole-callset one.
    """
    matches = [index for index, meta in enumerate(strata_meta) if meta == keys]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one stratum matching {keys}, found {len(matches)}")
    return matches[0]


def prepare_allele_number(allele_number_path: str, filter_intervals: Optional[List[str]] = None):
    """Prepare an all-sites allele number table for the browser's call rate track.

    Emits, for every base in the release, the adj allele number (``an``) and that
    allele number as a percentage of the attainable allele number
    (``an_percent``). The percentage is what the track plots: raw allele number
    scales with sample count, so exome and genome series drawn against one axis
    are only comparable once both are normalised.
    """
    ds = hl.read_table(allele_number_path)

    strata_meta, strata_sample_count = hl.eval((ds.strata_meta, ds.strata_sample_count))
    strata_meta = [dict(meta) for meta in strata_meta]

    if len(strata_meta) != len(strata_sample_count):
        raise ValueError(
            f"strata_meta ({len(strata_meta)}) and strata_sample_count ({len(strata_sample_count)}) "
            "have different lengths, but are indexed in parallel"
        )

    # adj, not raw. A genotype contributes to AN only when it passes gnomAD's
    # quality thresholds (GQ >= 20, DP >= 10 and, for heterozygous calls, an
    # allele balance >= 0.2), so the track agrees with the allele counts shown
    # in the variant tables.
    adj_index = _stratum_index(strata_meta, {"group": "adj"})
    n_total = strata_sample_count[adj_index]
    n_xx = strata_sample_count[_stratum_index(strata_meta, {"group": "adj", "sex": "XX"})]
    n_xy = strata_sample_count[_stratum_index(strata_meta, {"group": "adj", "sex": "XY"})]

    # The sex strata partition the callset, so this is an identity rather than a
    # tolerance check. If it does not hold, every denominator below is wrong.
    if n_xx + n_xy != n_total:
        raise ValueError(
            f"XX ({n_xx:,}) + XY ({n_xy:,}) != total ({n_total:,}); "
            "the ploidy-aware denominators need both karyotype counts"
        )

    an = ds.AN[adj_index]

    # The default branch is the diploid case, which covers the autosomes and the
    # pseudoautosomal regions of chrX. Every contig class that is *not* diploid
    # is matched explicitly above it, so no haploid site can quietly take a
    # diploid denominator and report half its true call rate.
    max_an = (
        hl.case()
        .when(ds.locus.in_x_nonpar(), max_allele_number(X_NON_PAR, n_xx, n_xy))
        .when(ds.locus.in_y_nonpar(), max_allele_number(Y_NON_PAR, n_xx, n_xy))
        # chrY PAR calls are assigned to chrX in the release tables, so this
        # branch matches nothing today. It is here so that the expression stays
        # correct if those rows ever appear.
        .when(ds.locus.in_y_par(), max_allele_number(Y_PAR, n_xx, n_xy))
        .when(ds.locus.in_mito(), max_allele_number(MITOCHONDRIAL, n_xx, n_xy))
        .default(max_allele_number(AUTOSOMAL, n_xx, n_xy))
    )

    ds = ds.select(
        xpos=x_position(ds.locus),
        an=an,
        # chrY denominators are zero in an all-XX callset. A site where no
        # sample could have been called has no meaningful call rate, so leave it
        # missing rather than reporting 0%.
        an_percent=hl.if_else(max_an > 0, 100 * (an / max_an), hl.missing(hl.tfloat64)),
    )

    # strata_meta and strata_sample_count describe hundreds of strata that this
    # table no longer carries; drop them rather than passing them downstream.
    ds = ds.select_globals()

    if filter_intervals:
        intervals = [hl.parse_locus_interval(interval, reference_genome="GRCh38") for interval in filter_intervals]
        ds = hl.filter_intervals(ds, intervals)

    return ds

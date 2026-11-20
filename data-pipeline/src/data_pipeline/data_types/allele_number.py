from typing import Dict, List, Optional

import hail as hl

from data_pipeline.data_types.locus import x_position


def _stratum_index(strata_meta: List[Dict[str, str]], keys: Dict[str, str]) -> int:
    """Index into the AN array of the stratum described exactly by ``keys``.

    ``AN`` is an array parallel to the ``strata_meta`` / ``strata_sample_count``
    globals, so a stratum is addressed by position. Matching on equality rather
    than a subset is deliberate: ``{"group": "adj"}`` is a prefix of every
    ancestry- and sex-stratified entry, so a subset match would pick the first of
    hundreds.
    """
    matches = [index for index, meta in enumerate(strata_meta) if meta == keys]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one stratum matching {keys}, found {len(matches)}")
    return matches[0]


def prepare_allele_number(allele_number_path: str, filter_intervals: Optional[List[str]] = None):
    """Prepare an all-sites allele number table for the browser's AN track.

    Emits, per base, the allele number and the percentage of the attainable
    allele number that represents. AN% is what makes the track comparable across
    data types and releases -- raw AN scales with sample count, so an exome and a
    genome series drawn on one axis are not otherwise on the same footing.
    """
    ht = hl.read_table(allele_number_path)

    strata = hl.eval(hl.struct(meta=ht.strata_meta, counts=ht.strata_sample_count))
    strata_meta = [dict(meta) for meta in strata.meta]

    # adj, not raw. A call contributes to AN only when GQ >= 20, DP >= 10 and,
    # for heterozygous calls, allele balance >= 0.2 -- the thresholds gnomAD
    # applies when reporting allele counts, so the track agrees with the variant
    # tables. (In v5, All of Us hom-ref calls carry no DP and are published only
    # at GQ >= 20, so every hom-ref call is adj; variant sites use the full rule.)
    global_index = _stratum_index(strata_meta, {"group": "adj"})
    xx_index = _stratum_index(strata_meta, {"group": "adj", "sex": "XX"})
    xy_index = _stratum_index(strata_meta, {"group": "adj", "sex": "XY"})

    n_total = strata.counts[global_index]
    n_xx = strata.counts[xx_index]
    n_xy = strata.counts[xy_index]

    # The sex strata partition the callset, so this is an identity, not a
    # tolerance check. If it ever fails the denominators below are wrong.
    if n_xx + n_xy != n_total:
        raise ValueError(
            f"XX ({n_xx:,}) + XY ({n_xy:,}) != total ({n_total:,}); "
            "the ploidy-aware denominator needs both karyotype counts"
        )

    # Attainable AN depends on ploidy, so it is not a flat 2N: on chrX outside the
    # pseudoautosomal regions XY samples are haploid, and on chrY only XY samples
    # contribute at all. Autosomes and chrX PAR fall through to 2N.
    max_an = (
        hl.case()
        .when(ht.locus.in_x_nonpar(), 2 * n_xx + n_xy)
        .when(ht.locus.in_y_nonpar(), n_xy)
        # chrY PAR is masked in the release tables (PAR calls are assigned to
        # chrX), so this branch matches no rows today. It is here so that the
        # expression is total rather than silently falling through to 2N, which
        # would be wrong by a factor of ~2 if those rows ever appear.
        .when(ht.locus.in_y_par(), 2 * n_xy)
        .default(2 * n_total)
    )

    an = ht.AN[global_index]

    ht = ht.select(
        xpos=x_position(ht.locus),
        an=an,
        # Guarded because chrY denominators are zero in an all-XX callset.
        an_percent=hl.if_else(max_an > 0, 100 * an / max_an, hl.missing(hl.tfloat64)),
    )

    # The strata globals describe hundreds of strata this table no longer carries.
    ht = ht.select_globals()

    if filter_intervals:
        intervals = [hl.parse_locus_interval(interval, reference_genome="GRCh38") for interval in filter_intervals]
        ht = hl.filter_intervals(ht, intervals)

    return ht

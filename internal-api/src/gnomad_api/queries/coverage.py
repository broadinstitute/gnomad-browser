import math

import hail as hl

from ..parameters.types import ReferenceGenome, RegionId
from .helpers import collect


def get_coverage_for_region(coverage: hl.Table, region_id: RegionId, reference_genome: ReferenceGenome):
    n_bins = 1000

    region_size = region_id.stop - region_id.start
    bin_size = math.ceil(region_size / n_bins)

    coverage = coverage.select(
        "mean",
        "median",
        "over_1",
        "over_5",
        "over_10",
        "over_15",
        "over_20",
        "over_25",
        "over_30",
        "over_50",
        "over_100",
    )

    start = region_id.start
    ds = hl.utils.range_table(region_size, 1)
    contig = region_id.chrom if reference_genome == "GRCh37" else "chr" + region_id.chrom
    ds = ds.select(locus=hl.locus(contig, start + ds.idx, reference_genome))

    ds = ds.annotate(
        coverage=hl.or_else(
            coverage[ds.locus],
            hl.struct(
                mean=0,
                median=0,
                over_1=0,
                over_5=0,
                over_10=0,
                over_15=0,
                over_20=0,
                over_25=0,
                over_30=0,
                over_50=0,
                over_100=0,
            ),
        )
    )

    # Average all coverage values within each bucket.
    ds = ds.group_by(bin=(ds.locus.position - start) // bin_size).aggregate(
        pos=hl.int(hl.agg.mean(ds.locus.position)),
        mean=hl.agg.mean(ds.coverage.mean),
        median=hl.agg.mean(ds.coverage.median),
        over_1=hl.agg.mean(ds.coverage.over_1),
        over_5=hl.agg.mean(ds.coverage.over_5),
        over_10=hl.agg.mean(ds.coverage.over_10),
        over_15=hl.agg.mean(ds.coverage.over_15),
        over_20=hl.agg.mean(ds.coverage.over_20),
        over_25=hl.agg.mean(ds.coverage.over_25),
        over_30=hl.agg.mean(ds.coverage.over_30),
        over_50=hl.agg.mean(ds.coverage.over_50),
        over_100=hl.agg.mean(ds.coverage.over_100),
    )

    return collect(ds)


def get_feature_coverage(ds: hl.Table, feature_id: str):
    ds = ds.filter(ds.feature_id == feature_id)
    coverage = ds.collect()

    if not coverage:
        return {"exome": [], "genome": []}

    return coverage[0]

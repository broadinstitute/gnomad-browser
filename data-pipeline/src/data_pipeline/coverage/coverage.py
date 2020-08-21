import hail as hl

from data_pipeline.partitions import FEATURE_COVERAGE_NUM_PARTITIONS

from data_pipeline.gene_models.gene_models import merge_overlapping_regions


def prepare_coverage(coverage_path):
    coverage = hl.read_table(coverage_path)

    # Median field name is different in v3.0.1 vs v2
    if "median" not in coverage.row.dtype.fields:
        coverage = coverage.annotate(median=coverage.median_approx)

    # Drop extra fields in v3
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

    return coverage


def prepare_feature_coverage_buckets(genes_or_transcripts_path, reference_genome):
    ds = hl.read_table(genes_or_transcripts_path)
    assert len(ds.key.dtype.fields) == 1, "Expected single-field key"
    id_field = ds.key.dtype.fields[0]  # gene_id or transcript_id
    ds = ds.rename({id_field: "feature_id"})

    ds = ds.annotate(contig=ds.chrom if reference_genome == "GRCh37" else "chr" + ds.chrom)

    exon_padding = 75
    ds = ds.select(
        "contig",
        regions=merge_overlapping_regions(
            ds.exons.map(
                lambda exon: hl.struct(
                    start=hl.max(exon.start - exon_padding, 1),
                    stop=hl.min(exon.stop + exon_padding, hl.contig_length(ds.contig, reference_genome)),
                )
            )
        ),
    )

    n_buckets = 500

    ds = ds.annotate(bucket_size=ds.regions.fold(lambda acc, region: acc + region.stop - region.start, 0) / n_buckets,)

    ds = ds.annotate(
        buckets=ds.regions.flatmap(
            lambda region: hl.rbind(
                hl.int(hl.ceil((region.stop - region.start) / ds.bucket_size)),
                lambda n_region_buckets: hl.rbind(
                    hl.int(hl.ceil((region.stop - region.start) / n_region_buckets)),
                    lambda region_bucket_size: hl.range(n_region_buckets).map(
                        lambda i: hl.struct(
                            start=hl.min(
                                region.start + i * region_bucket_size, hl.contig_length(ds.contig, reference_genome),
                            ),
                            stop=hl.min(
                                region.start + (i + 1) * region_bucket_size,
                                hl.contig_length(ds.contig, reference_genome),
                            ),
                        )
                    ),
                ),
            )
        )
    )

    ds = ds.annotate(buckets=hl.zip_with_index(ds.buckets).map(lambda b: b[1].annotate(index=b[0])))

    ds = ds.select("contig", "buckets")
    ds = ds.explode(ds.buckets, name="bucket")
    ds = ds.annotate(positions=hl.range(ds.bucket.start, ds.bucket.stop + 1))
    ds = ds.explode(ds.positions, name="position")
    ds = ds.select("bucket", locus=hl.locus(ds.contig, ds.position, reference_genome))

    return ds


def _prepare_feature_coverage_helper(coverage_path, bucket_loci):
    coverage = hl.read_table(coverage_path)

    ds = bucket_loci.annotate(
        coverage=hl.or_else(
            coverage[bucket_loci.locus],
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
    ds = ds.group_by(feature_id=ds.feature_id, bucket_index=ds.bucket.index).aggregate(
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

    # Reduce table into one row per feature containing all buckets for that feature.
    ds = ds.group_by(ds.feature_id).aggregate(buckets=hl.agg.collect(ds.row_value))

    return ds


def prepare_feature_coverage(bucket_loci_path, exome_coverage_path=None, genome_coverage_path=None):
    assert (
        exome_coverage_path or genome_coverage_path
    ), "At least one of exome_coverage_path or genome_coverage_path is required"

    bucket_loci = hl.read_table(bucket_loci_path)

    if exome_coverage_path:
        exome_coverage = _prepare_feature_coverage_helper(exome_coverage_path, bucket_loci)
        exome_coverage = exome_coverage.select(exome=exome_coverage.buckets)
        if genome_coverage_path:
            genome_coverage = _prepare_feature_coverage_helper(genome_coverage_path, bucket_loci)
            genome_coverage = genome_coverage.select(genome=genome_coverage.buckets)
            coverage = exome_coverage.join(genome_coverage, how="outer")
            coverage = coverage.repartition(FEATURE_COVERAGE_NUM_PARTITIONS, shuffle=True)
            return coverage

        coverage = exome_coverage.annotate(genome=hl.empty_array(exome_coverage.exome.dtype.element_type))
        coverage = coverage.repartition(FEATURE_COVERAGE_NUM_PARTITIONS, shuffle=True)
        return coverage
    elif genome_coverage_path:
        genome_coverage = _prepare_feature_coverage_helper(genome_coverage_path, bucket_loci)
        genome_coverage = genome_coverage.select(genome=genome_coverage.buckets)
        coverage = genome_coverage.annotate(exome=hl.empty_array(genome_coverage.genome.dtype.element_type))
        coverage = coverage.repartition(FEATURE_COVERAGE_NUM_PARTITIONS, shuffle=True)
        return coverage

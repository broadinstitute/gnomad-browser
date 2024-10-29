import itertools

import hail as hl

from data_pipeline.data_types.variant import variant_id


def nullify_nan(value):
    return hl.if_else(hl.is_nan(value), hl.null(value.dtype), value)


def freq_index_key(subset=None, pop=None, sex=None, raw=False):
    parts = [s for s in [subset, pop, sex] if s is not None]
    parts.append("raw" if raw else "adj")
    return "_".join(parts)


def prepare_gnomad_v4_variants_helper(input_path: str, exomes_or_genomes: str):
    ds = hl.read_table(input_path)
    g = hl.eval(ds.globals)

    ds = ds.select_globals()

    subsets = set(m.get("subset", None) for m in g.freq_meta)

    def freq(ds, *args, **kwargs):
        return ds.freq[g.freq_index_dict[freq_index_key(*args, **kwargs)]]

    ############################
    # Derived top level fields #
    ############################

    ds = ds.annotate(variant_id=variant_id(ds.locus, ds.alleles))
    ds = ds.rename({"rsid": "rsids"})

    ######################
    # Colocated variants #
    ######################

    variants_by_locus = ds.select(
        ds.variant_id,
        ac_raw=hl.struct(**{subset or "all": freq(ds, subset=subset, raw=True).AC for subset in subsets}),
    )
    variants_by_locus = variants_by_locus.group_by("locus").aggregate(
        variants=hl.agg.collect(variants_by_locus.row_value)
    )

    def subset_filter(subset):
        return lambda variant: variant.ac_raw[subset] > 0

    variants_by_locus = variants_by_locus.annotate(
        variant_ids=hl.struct(
            **{
                subset
                or "all": variants_by_locus.variants.filter(subset_filter(subset or "all")).map(
                    lambda variant: variant.variant_id
                )
                for subset in subsets
            }
        )
    )

    ds = ds.annotate(colocated_variants=variants_by_locus[ds.locus].variant_ids)
    ds = ds.annotate(
        colocated_variants=hl.struct(
            **{
                subset: ds.colocated_variants[subset].filter(lambda variant_id: variant_id != ds.variant_id)
                for subset in ds.colocated_variants._fields
            }
        )
    )

    ###############
    # Frequencies #
    ###############

    subset_ancestry_groups = {}
    for subset in subsets:
        subset_ancestry_groups[subset] = set(
            m.get("gen_anc", None) for m in g.freq_meta if m.get("subset", None) == subset
        )

        subset_ancestry_groups[subset].discard(None)

        # "global" population is used for downsamplings
        subset_ancestry_groups[subset].discard("global")

    ds = ds.annotate(in_autosome_or_par=ds.locus.in_autosome_or_par())

    ds = ds.annotate(
        gnomad=hl.struct(
            freq=hl.struct(
                **{
                    subset
                    or "all": hl.struct(
                        ac=freq(ds, subset=subset).AC,
                        ac_raw=freq(ds, subset=subset, raw=True).AC,
                        an=freq(ds, subset=subset).AN,
                        hemizygote_count=hl.if_else(
                            ds.in_autosome_or_par, 0, hl.or_else(freq(ds, subset=subset, sex="XY").AC, 0)
                        ),
                        homozygote_count=freq(ds, subset=subset).homozygote_count,
                        ancestry_groups=[
                            hl.struct(
                                id="_".join(filter(bool, [pop, sex])),
                                ac=hl.or_else(freq(ds, subset=subset, pop=pop, sex=sex).AC, 0),
                                an=hl.or_else(freq(ds, subset=subset, pop=pop, sex=sex).AN, 0),
                                hemizygote_count=(
                                    0
                                    if sex == "XX"
                                    else hl.if_else(
                                        ds.in_autosome_or_par,
                                        0,
                                        hl.or_else(freq(ds, subset=subset, pop=pop, sex="XY").AC, 0),
                                    )
                                ),
                                homozygote_count=hl.or_else(
                                    freq(ds, subset=subset, pop=pop, sex=sex).homozygote_count, 0
                                ),
                            )
                            for pop, sex in list(itertools.product(subset_ancestry_groups[subset], [None, "XX", "XY"]))
                            + [(None, "XX"), (None, "XY")]
                        ],
                    )
                    for subset in subsets
                }
            )
        )
    )

    # If a variant is not present in a subset, do not store population frequencies for that subset
    ds = ds.annotate(
        gnomad=ds.gnomad.annotate(
            freq=ds.gnomad.freq.annotate(
                **{
                    subset
                    or "all": ds.gnomad.freq[subset or "all"].annotate(
                        ancestry_groups=hl.if_else(
                            ds.gnomad.freq[subset or "all"].ac_raw == 0,
                            hl.empty_array(ds.gnomad.freq[subset or "all"].ancestry_groups.dtype.element_type),
                            ds.gnomad.freq[subset or "all"].ancestry_groups,
                        )
                    )
                    for subset in subsets
                }
            )
        )
    )

    ds = ds.drop("freq", "in_autosome_or_par")

    ###########################################
    # Subsets in which the variant is present #
    ###########################################

    ds = ds.annotate(
        subsets=hl.set(
            hl.array([(subset, ds.gnomad.freq[subset].ac_raw > 0) for subset in subsets if subset is not None])
            .filter(lambda t: t[1])
            .map(lambda t: t[0])
        )
    )

    ##############################
    # Filtering allele frequency #
    ##############################

    faf_populations = [pop for pop in subset_ancestry_groups[None] if f"{pop}_adj" in g.faf_index_dict]

    # Get grpmax FAFs
    ds = ds.annotate(
        gnomad=ds.gnomad.annotate(
            faf95=hl.rbind(
                hl.sorted(
                    hl.array(
                        [
                            hl.struct(faf=ds.faf[g.faf_index_dict[f"{pop}_adj"]].faf95, population=pop)
                            for pop in faf_populations
                        ]
                    ).filter(lambda f: f.faf > 0),
                    key=lambda f: (-f.faf, f.population),
                ),
                lambda fafs: hl.if_else(
                    hl.len(fafs) > 0,
                    hl.struct(grpmax=fafs[0].faf, grpmax_gen_anc=fafs[0].population),
                    hl.struct(grpmax=hl.missing(hl.tfloat), grpmax_gen_anc=hl.missing(hl.tstr)),
                ),
            ),
            faf99=hl.rbind(
                hl.sorted(
                    hl.array(
                        [
                            hl.struct(faf=ds.faf[g.faf_index_dict[f"{pop}_adj"]].faf99, population=pop)
                            for pop in faf_populations
                        ]
                    ).filter(lambda f: f.faf > 0),
                    key=lambda f: (-f.faf, f.population),
                ),
                lambda fafs: hl.if_else(
                    hl.len(fafs) > 0,
                    hl.struct(grpmax=fafs[0].faf, grpmax_gen_anc=fafs[0].population),
                    hl.struct(grpmax=hl.missing(hl.tfloat), grpmax_gen_anc=hl.missing(hl.tstr)),
                ),
            ),
        ),
    )

    ds = ds.annotate(gnomad=ds.gnomad.annotate(fafmax=ds.fafmax))

    ds = ds.drop("faf", "fafmax")

    ####################
    # Age distribution #
    ####################

    ds = ds.annotate(
        gnomad=ds.gnomad.annotate(
            age_distribution=hl.struct(
                het=ds.histograms.age_hists.age_hist_het, hom=ds.histograms.age_hists.age_hist_hom
            )
        )
    )

    ###################
    # Quality metrics #
    ###################

    ds = ds.annotate(
        gnomad=ds.gnomad.annotate(
            filters=ds.filters,
            quality_metrics=hl.struct(
                allele_balance=hl.struct(
                    alt_adj=ds.histograms.qual_hists.ab_hist_alt.annotate(
                        bin_edges=ds.histograms.qual_hists.ab_hist_alt.bin_edges.map(
                            lambda n: hl.float(hl.format("%.3f", n))
                        )
                    ),
                    alt_raw=ds.histograms.raw_qual_hists.ab_hist_alt.annotate(
                        bin_edges=ds.histograms.raw_qual_hists.ab_hist_alt.bin_edges.map(
                            lambda n: hl.float(hl.format("%.3f", n))
                        )
                    ),
                ),
                genotype_depth=hl.struct(
                    all_adj=ds.histograms.qual_hists.dp_hist_all,
                    all_raw=ds.histograms.raw_qual_hists.dp_hist_all,
                    alt_adj=ds.histograms.qual_hists.dp_hist_alt,
                    alt_raw=ds.histograms.raw_qual_hists.dp_hist_alt,
                ),
                genotype_quality=hl.struct(
                    all_adj=ds.histograms.qual_hists.gq_hist_all,
                    all_raw=ds.histograms.raw_qual_hists.gq_hist_all,
                    alt_adj=ds.histograms.qual_hists.gq_hist_alt,
                    alt_raw=ds.histograms.raw_qual_hists.gq_hist_alt,
                ),
                site_quality_metrics=[hl.struct(metric="SiteQuality", value=hl.float(nullify_nan(ds.info.QUALapprox)))]
                + [
                    hl.struct(metric=metric, value=hl.float(nullify_nan(ds.info[metric])))
                    for metric in [
                        "inbreeding_coeff",
                        "AS_MQ",
                        "AS_FS",
                        "AS_MQRankSum",
                        "AS_pab_max",
                        "AS_QUALapprox",
                        "AS_QD",
                        "AS_ReadPosRankSum",
                        "AS_SOR",
                        "AS_VarDP",
                        "AS_VQSLOD",
                    ]
                ],
            ),
        )
    )

    ds = ds.drop("filters", "histograms")

    #########
    # Flags #
    #########

    flags = [
        hl.or_missing(ds.region_flags.lcr, "lcr"),
        hl.or_missing(ds.region_flags.segdup, "segdup"),
        hl.or_missing(
            ((ds.locus.contig == "chrX") & ds.locus.in_x_par()) | ((ds.locus.contig == "chrY") & ds.locus.in_y_par()),
            "par",
        ),
        hl.or_missing(ds.info.monoallelic, "monoallelic"),
    ]

    if exomes_or_genomes == "exomes":
        flags = flags + [
            hl.or_missing(ds.region_flags.fail_interval_qc, "fail_interval_qc"),
            hl.or_missing(ds.region_flags.outside_ukb_capture_region, "outside_ukb_capture_region"),
            hl.or_missing(ds.region_flags.outside_broad_capture_region, "outside_broad_capture_region"),
        ]

    ds = ds.annotate(flags=hl.set(flags).filter(hl.is_defined))

    ds = ds.drop("region_flags")

    ################
    # Other fields #
    ################

    # Drop unused fields
    ds = ds.drop("allele_info", "a_index", "info", "was_split", "grpmax", "vqsr_results")

    ds = ds.transmute(**ds.gnomad)
    ds = ds.select(**{exomes_or_genomes: ds.row_value})
    # ds = ds.rename({"gnomad": exomes_or_genomes})

    return ds


def prepare_gnomad_v4_variants_joint_frequency_helper(variants_joint_frequency_path):
    ds = hl.read_table(variants_joint_frequency_path)
    globals = hl.eval(ds.globals)

    def joint_freq_index_key(subset=None, pop=None, sex=None, raw=False):
        parts = [s for s in [subset, pop, sex] if s is not None]
        parts.append("raw" if raw else "adj")
        return "_".join(parts)

    def freq_joint(ds, subset=None, pop=None, sex=None, raw=False):
        return ds.joint.freq[globals.joint_globals.freq_index_dict[joint_freq_index_key(subset, pop, sex, raw)]]

    flags = [
        hl.or_missing(ds.freq_comparison_stats.cochran_mantel_haenszel_test.p_value < 10e-4, "discrepant_frequencies"),
        hl.or_missing(ds.region_flags.not_called_in_exomes, "not_called_in_exomes"),
        hl.or_missing(ds.region_flags.not_called_in_genomes, "not_called_in_genomes"),
    ]

    ancestry_groups = set(m.get("gen_anc", None) for m in globals.joint_globals.freq_meta)

    ds = ds.annotate(
        joint=hl.struct(
            freq=hl.struct(
                all=hl.struct(
                    ac=freq_joint(ds).AC,
                    ac_raw=freq_joint(ds, raw=True).AC,
                    an=freq_joint(ds).AN,
                    hemizygote_count=hl.if_else(
                        ds.locus.in_autosome_or_par(), 0, hl.or_else(freq_joint(ds, sex="XY").AC, 0)
                    ),
                    homozygote_count=freq_joint(ds).homozygote_count,
                    ancestry_groups=[
                        hl.struct(
                            id="_".join(filter(bool, [pop, sex])),
                            ac=hl.or_else(freq_joint(ds, pop=pop, sex=sex).AC, 0),
                            an=hl.or_else(freq_joint(ds, pop=pop, sex=sex).AN, 0),
                            hemizygote_count=(
                                0
                                if sex == "XX"
                                else hl.if_else(
                                    ds.locus.in_autosome_or_par(),
                                    0,
                                    hl.or_else(freq_joint(ds, pop=pop, sex="XY").AC, 0),
                                )
                            ),
                            homozygote_count=hl.or_else(freq_joint(ds, pop=pop, sex=sex).homozygote_count, 0),
                        )
                        for pop, sex in list(itertools.product(ancestry_groups, [None, "XX", "XY"]))
                        + [(None, "XX"), (None, "XY")]
                    ],
                ),
            ),
            faf=ds.joint.faf,
            fafmax=ds.joint.fafmax,
            grpmax=ds.joint.grpmax,
            histograms=ds.joint.histograms,
            flags=hl.set(flags).filter(hl.is_defined),
            faf95_joint=hl.struct(
                grpmax=ds.joint.fafmax.faf95_max,
                grpmax_gen_anc=ds.joint.fafmax.faf95_max_gen_anc,
            ),
            faf99_joint=hl.struct(
                grpmax=ds.joint.fafmax.faf99_max,
                grpmax_gen_anc=ds.joint.fafmax.faf99_max_gen_anc,
            ),
            freq_comparison_stats=ds.freq_comparison_stats,
        ),
    )

    ds = ds.select(
        "joint",
    )

    return ds


def prepare_table_for_release(variants_table_path):
    ds = hl.read_table(variants_table_path)
    ds = ds.annotate(
        exomes=ds.exomes.drop("faf95", "faf99"),
        genomes=ds.genomes.drop("faf95", "faf99"),
        joint=ds.joint.drop("faf99_joint", "faf95_joint"),
    )
    ds = ds.select_globals(mane_select_version=ds.globals.mane_transcripts_version)
    return ds


def prepare_gnomad_v4_variants(exome_variants_path: str, genome_variants_path: str, variants_joint_frequency_path: str):
    exome_variants = prepare_gnomad_v4_variants_helper(exome_variants_path, "exome")
    genome_variants = prepare_gnomad_v4_variants_helper(genome_variants_path, "genome")

    variants = exome_variants.join(genome_variants, "outer")

    shared_fields = [
        # "lcr",
        # "nonpar",
        "rsids",
        # "segdup",
        "vep",
        "in_silico_predictors",
        "variant_id",
    ]
    variants = variants.annotate(
        **{field: hl.or_else(variants.exome[field], variants.genome[field]) for field in shared_fields}
    )

    variants = variants.annotate(exome=variants.exome.drop(*shared_fields), genome=variants.genome.drop(*shared_fields))

    # Colocated variants
    variants = variants.cache()
    variants_by_locus = variants.select(
        variants.variant_id,
        exome_ac_raw=hl.struct(**{f: variants.exome.freq[f].ac_raw for f in variants.exome.freq.dtype.fields}),
        genome_ac_raw=hl.struct(
            **{f: variants.genome.freq[f].ac_raw for f in variants.genome.freq.dtype.fields},
        ),
    )
    variants_by_locus = variants_by_locus.group_by("locus").aggregate(
        variants=hl.agg.collect(variants_by_locus.row_value)
    )

    def subset_filter(subset):
        def fn(variant):
            return hl.if_else(
                subset in list(variant.exome_ac_raw) and (variant.exome_ac_raw[subset] > 0),
                True,
                subset in list(variant.genome_ac_raw) and (variant.genome_ac_raw[subset] > 0),
            )

        return fn

    variants_by_locus = variants_by_locus.annotate(
        variant_ids=hl.struct(
            **{
                subset: variants_by_locus.variants.filter(subset_filter(subset)).map(lambda variant: variant.variant_id)
                for subset in ["all", "non_ukb", "hgdp", "tgp"]
            }
        )
    )

    variants = variants.annotate(colocated_variants=variants_by_locus[variants.locus].variant_ids)
    variants = variants.annotate(
        colocated_variants=hl.struct(
            **{
                subset: variants.colocated_variants[subset].filter(lambda variant_id: variant_id != variants.variant_id)
                for subset in ["all", "non_ukb", "hgdp", "tgp"]
            }
        )
    )

    joint_frequency_data = prepare_gnomad_v4_variants_joint_frequency_helper(variants_joint_frequency_path)
    variants = variants.annotate(**joint_frequency_data[variants.locus, variants.alleles])

    return variants

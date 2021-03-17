import itertools

import hail as hl

from data_pipeline.data_types.variant import variant_id


def nullify_nan(value):
    return hl.if_else(hl.is_nan(value), hl.null(value.dtype), value)


def freq_index_key(subset=None, pop=None, sex=None, raw=False):
    parts = [s for s in [subset, pop, sex] if s is not None]
    parts.append("raw" if raw else "adj")
    return "-".join(parts)


def prepare_gnomad_v3_variants(path):
    ds = hl.read_table(path)

    g = hl.eval(ds.globals)

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

    subset_populations = {}
    for subset in subsets:
        subset_populations[subset] = set(m.get("pop", None) for m in g.freq_meta if m.get("subset", None) == subset)

        subset_populations[subset].discard(None)

        # "global" population is used for downsamplings
        subset_populations[subset].discard("global")

    ds = ds.annotate(in_autosome_or_par=ds.locus.in_autosome_or_par())

    ds = ds.annotate(
        genome=hl.struct(
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
                        populations=[
                            hl.struct(
                                id="_".join(filter(bool, [pop, sex])),
                                ac=hl.or_else(freq(ds, subset=subset, pop=pop, sex=sex).AC, 0),
                                an=hl.or_else(freq(ds, subset=subset, pop=pop, sex=sex).AN, 0),
                                hemizygote_count=0
                                if sex == "XX"
                                else hl.if_else(
                                    ds.in_autosome_or_par,
                                    0,
                                    hl.or_else(freq(ds, subset=subset, pop=pop, sex="XY").AC, 0),
                                ),
                                homozygote_count=hl.or_else(
                                    freq(ds, subset=subset, pop=pop, sex=sex).homozygote_count, 0
                                ),
                            )
                            for pop, sex in list(itertools.product(subset_populations[subset], [None, "XX", "XY"]))
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
        genome=ds.genome.annotate(
            freq=ds.genome.freq.annotate(
                **{
                    subset
                    or "all": ds.genome.freq[subset or "all"].annotate(
                        populations=hl.if_else(
                            ds.genome.freq[subset or "all"].ac_raw == 0,
                            hl.empty_array(ds.genome.freq[subset or "all"].populations.dtype.element_type),
                            ds.genome.freq[subset or "all"].populations,
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
            hl.array([(subset, ds.genome.freq[subset].ac_raw > 0) for subset in subsets if subset is not None])
            .filter(lambda t: t[1])
            .map(lambda t: t[0])
        )
    )

    ##############################
    # Filtering allele frequency #
    ##############################

    faf_populations = [pop for pop in subset_populations[None] if f"{pop}-adj" in g.faf_index_dict]

    # Get popmax FAFs
    ds = ds.annotate(
        genome=ds.genome.annotate(
            faf95=hl.rbind(
                hl.sorted(
                    hl.array(
                        [
                            hl.struct(faf=ds.faf[g.faf_index_dict[f"{pop}-adj"]].faf95, population=pop)
                            for pop in faf_populations
                        ]
                    ),
                    key=lambda f: (-f.faf, f.population),
                ),
                lambda fafs: hl.if_else(
                    hl.len(fafs) > 0,
                    hl.struct(popmax=fafs[0].faf, popmax_population=fafs[0].population),
                    hl.struct(popmax=hl.null(hl.tfloat), popmax_population=hl.null(hl.tstr)),
                ),
            ),
            faf99=hl.rbind(
                hl.sorted(
                    hl.array(
                        [
                            hl.struct(faf=ds.faf[g.faf_index_dict[f"{pop}-adj"]].faf99, population=pop)
                            for pop in faf_populations
                        ]
                    ),
                    key=lambda f: (-f.faf, f.population),
                ),
                lambda fafs: hl.if_else(
                    hl.len(fafs) > 0,
                    hl.struct(popmax=fafs[0].faf, popmax_population=fafs[0].population),
                    hl.struct(popmax=hl.null(hl.tfloat), popmax_population=hl.null(hl.tstr)),
                ),
            ),
        )
    )

    ds = ds.drop("faf")

    ####################
    # Age distribution #
    ####################

    ds = ds.annotate(genome=ds.genome.annotate(age_distribution=hl.struct(het=ds.age_hist_het, hom=ds.age_hist_hom)))

    ds = ds.drop("age_hist_het", "age_hist_hom")

    ###################
    # Quality metrics #
    ###################

    ds = ds.annotate(
        genome=ds.genome.annotate(
            filters=ds.filters,
            quality_metrics=hl.struct(
                allele_balance=hl.struct(
                    alt_adj=ds.qual_hists.ab_hist_alt.annotate(
                        bin_edges=ds.qual_hists.ab_hist_alt.bin_edges.map(lambda n: hl.float(hl.format("%.3f", n)))
                    ),
                    alt_raw=ds.raw_qual_hists.ab_hist_alt.annotate(
                        bin_edges=ds.raw_qual_hists.ab_hist_alt.bin_edges.map(lambda n: hl.float(hl.format("%.3f", n)))
                    ),
                ),
                genotype_depth=hl.struct(
                    all_adj=ds.qual_hists.dp_hist_all,
                    all_raw=ds.raw_qual_hists.dp_hist_all,
                    alt_adj=ds.qual_hists.dp_hist_alt,
                    alt_raw=ds.raw_qual_hists.dp_hist_alt,
                ),
                genotype_quality=hl.struct(
                    all_adj=ds.qual_hists.gq_hist_all,
                    all_raw=ds.raw_qual_hists.gq_hist_all,
                    alt_adj=ds.qual_hists.gq_hist_alt,
                    alt_raw=ds.raw_qual_hists.gq_hist_alt,
                ),
                site_quality_metrics=[hl.struct(metric="SiteQuality", value=hl.float(nullify_nan(ds.info.QUALapprox)))]
                + [
                    hl.struct(metric=metric, value=hl.float(nullify_nan(ds.info[metric])))
                    for metric in [
                        "InbreedingCoeff",
                        "AS_FS",
                        "AS_MQ",
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

    ds = ds.drop("filters", "qual_hists", "raw_qual_hists", "vqsr")

    #########
    # Flags #
    #########

    ds = ds.annotate(
        flags=hl.set(
            [
                hl.or_missing(ds.region_flag.lcr, "lcr"),
                hl.or_missing(ds.region_flag.segdup, "segdup"),
                hl.or_missing(
                    ((ds.locus.contig == "chrX") & ds.locus.in_x_par())
                    | ((ds.locus.contig == "chrY") & ds.locus.in_y_par()),
                    "par",
                ),
                hl.or_missing(ds.info.monoallelic, "monoallelic"),
            ]
        ).filter(hl.is_defined)
    )

    ds = ds.drop("region_flag")

    ########################
    # In silico predictors #
    ########################

    ds = ds.transmute(
        in_silico_predictors=hl.struct(cadd=ds.cadd, primate_ai=ds.primate_ai, revel=ds.revel, splice_ai=ds.splice_ai)
    )

    ################
    # Other fields #
    ################

    # Drop unused fields
    ds = ds.drop("allele_info", "a_index", "info", "popmax", "was_split")

    return ds

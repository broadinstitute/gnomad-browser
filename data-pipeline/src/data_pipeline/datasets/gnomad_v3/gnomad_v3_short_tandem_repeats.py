import itertools
import json
from collections import defaultdict

import hail as hl


def _parse_region_id(region_id):
    [chrom, position_range] = region_id.split(":")
    chrom = chrom[3:]
    [start, stop] = map(int, position_range.split("-"))
    return {
        "chrom": chrom,
        "start": start,
        "stop": stop,
    }


def _prepare_histogram(histogram):
    return sorted(
        ([int(n_repeats), n_samples] for n_repeats, n_samples in histogram.items()), key=lambda value: value[0],
    )


def _population_sort_key(pop):
    pop_id = pop["id"]
    if pop_id == "XX" or pop_id == "XY":
        return ("zzz", pop_id)

    if "_" in pop_id:
        return tuple(pop_id.split("_"))

    return (pop_id, "")


def _get_total_histogram(histogram):
    total = defaultdict(int)
    for v in histogram.values():
        for k, n in v.items():
            total[k] += n

    return total


def _prepare_allele_size_distribution_populations(locus):
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountHistogram"].keys()))

    distributions = sorted(
        list(
            itertools.chain.from_iterable(
                [
                    {
                        "id": population,
                        "distribution": _prepare_histogram(
                            _get_total_histogram(
                                {
                                    k: v
                                    for k, v in locus["AlleleCountHistogram"].items()
                                    if k.split("/")[0] == population
                                }
                            )
                        ),
                    },
                    {
                        "id": f"{population}_XX",
                        "distribution": _prepare_histogram(
                            _get_total_histogram(
                                {
                                    k: v
                                    for k, v in locus["AlleleCountHistogram"].items()
                                    if k.split("/")[0] == population and k.split("/")[1] == "XX"
                                }
                            )
                        ),
                    },
                    {
                        "id": f"{population}_XY",
                        "distribution": _prepare_histogram(
                            _get_total_histogram(
                                {
                                    k: v
                                    for k, v in locus["AlleleCountHistogram"].items()
                                    if k.split("/")[0] == population and k.split("/")[1] == "XY"
                                }
                            )
                        ),
                    },
                ]
                for population in populations
            )
        )
        + [
            {
                "id": sex,
                "distribution": _prepare_histogram(
                    _get_total_histogram(
                        {k: v for k, v in locus["AlleleCountHistogram"].items() if k.split("/")[1] == sex}
                    )
                ),
            }
            for sex in ["XX", "XY"]
        ],
        key=_population_sort_key,
    )

    return [distribution for distribution in distributions if distribution["distribution"]]


def _prepare_allele_size_distribution_repeat_units(locus):
    repeat_units = sorted(set(key.split("/")[2] for key in locus["AlleleCountHistogram"].keys()))
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountHistogram"].keys()))

    distributions = sorted(
        [
            {
                "repeat_unit": repeat_unit,
                "distribution": _prepare_histogram(
                    _get_total_histogram(
                        {k: v for k, v in locus["AlleleCountHistogram"].items() if k.split("/")[2] == repeat_unit}
                    )
                ),
                "populations": sorted(
                    list(
                        itertools.chain.from_iterable(
                            [
                                {
                                    "id": population,
                                    "distribution": _prepare_histogram(
                                        _get_total_histogram(
                                            {
                                                k: v
                                                for k, v in locus["AlleleCountHistogram"].items()
                                                if k.split("/")[2] == repeat_unit and k.split("/")[0] == population
                                            }
                                        )
                                    ),
                                },
                                {
                                    "id": f"{population}_XX",
                                    "distribution": _prepare_histogram(
                                        locus["AlleleCountHistogram"].get(f"{population}/XX/{repeat_unit}", {})
                                    ),
                                },
                                {
                                    "id": f"{population}_XY",
                                    "distribution": _prepare_histogram(
                                        locus["AlleleCountHistogram"].get(f"{population}/XY/{repeat_unit}", {})
                                    ),
                                },
                            ]
                            for population in populations
                        )
                    )
                    + [
                        {
                            "id": sex,
                            "distribution": _prepare_histogram(
                                _get_total_histogram(
                                    {
                                        k: v
                                        for k, v in locus["AlleleCountHistogram"].items()
                                        if k.split("/")[2] == repeat_unit and k.split("/")[1] == sex
                                    }
                                )
                            ),
                        }
                        for sex in ["XX", "XY"]
                    ],
                    key=_population_sort_key,
                ),
            }
            for repeat_unit in repeat_units
        ],
        key=lambda r: (len(r["repeat_unit"]), r["repeat_unit"]),
    )

    return [distribution for distribution in distributions if distribution["distribution"]]


def _prepare_age_distribution(locus):
    age_bins = [
        ("<20", None, 20),
        ("20-25", 20, 25),
        ("25-30", 25, 30),
        ("30-35", 30, 35),
        ("35-40", 35, 40),
        ("40-45", 40, 45),
        ("45-50", 45, 50),
        ("50-55", 50, 55),
        ("55-60", 55, 60),
        ("60-65", 60, 65),
        ("65-70", 65, 70),
        ("70-75", 70, 75),
        ("75-80", 75, 80),
        (">80", 80, None),
    ]

    return [
        {
            "age_range": [min_age, max_age],
            "distribution": _prepare_histogram(locus["AgeDistribution"].get(age_key, {})),
        }
        for age_key, min_age, max_age in age_bins
    ]


def _prepare_genotype_distribution_histogram(histogram):
    return sorted(
        ([*(int(n) for n in n_repeats.split("/")), n_samples] for n_repeats, n_samples in histogram.items()),
        key=lambda value: (value[0], value[1]),
    )


def _filter_genotype_distribution_histogram(histogram, repeat_units=None, population=None, sex=None):
    predicates = []
    if repeat_units:
        predicates.append(
            lambda key: tuple(sorted(key.split("/")[2:4])) in (repeat_units, tuple(reversed(repeat_units)))
        )
    if population:
        predicates.append(lambda key: key.split("/")[0] == population)
    if sex:
        predicates.append(lambda key: key.split("/")[1] == sex)

    filtered_histogram = {k: v for k, v in histogram.items() if all(predicate(k) for predicate in predicates)}

    if not repeat_units:
        return filtered_histogram

    return dict(
        itertools.chain(
            ((k, v) for k, v in filtered_histogram.items() if tuple(k.split("/")[2:4]) == repeat_units),
            (
                (f"{k}-reversed", {"/".join(reversed(vk.split("/"))): vv for vk, vv in v.items()})
                for k, v in filtered_histogram.items()
                if tuple(k.split("/")[2:4]) == tuple(reversed(repeat_units))
                and tuple(k.split("/")[2:4]) != repeat_units
            ),
        )
    )


def _prepare_genotype_distribution_populations(locus):
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountScatterPlot"].keys()))

    distributions = sorted(
        list(
            itertools.chain.from_iterable(
                [
                    {
                        "id": population,
                        "distribution": _prepare_genotype_distribution_histogram(
                            _get_total_histogram(
                                _filter_genotype_distribution_histogram(
                                    locus["AlleleCountScatterPlot"], population=population
                                )
                            )
                        ),
                    },
                    {
                        "id": f"{population}_XX",
                        "distribution": _prepare_genotype_distribution_histogram(
                            _get_total_histogram(
                                _filter_genotype_distribution_histogram(
                                    locus["AlleleCountScatterPlot"], population=population, sex="XX"
                                )
                            )
                        ),
                    },
                    {
                        "id": f"{population}_XY",
                        "distribution": _prepare_genotype_distribution_histogram(
                            _get_total_histogram(
                                _filter_genotype_distribution_histogram(
                                    locus["AlleleCountScatterPlot"], population=population, sex="XY"
                                )
                            )
                        ),
                    },
                ]
                for population in populations
            )
        )
        + [
            {
                "id": sex,
                "distribution": _prepare_genotype_distribution_histogram(
                    _get_total_histogram(
                        _filter_genotype_distribution_histogram(locus["AlleleCountScatterPlot"], sex=sex)
                    )
                ),
            }
            for sex in ["XX", "XY"]
        ],
        key=_population_sort_key,
    )

    return [distribution for distribution in distributions if distribution["distribution"]]


def _prepare_genotype_distribution_repeat_units(locus):
    repeat_unit_pairs = sorted(
        set(tuple(sorted(key.split("/")[2:4])) for key in locus["AlleleCountScatterPlot"].keys())
    )
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountScatterPlot"].keys()))

    distributions = sorted(
        [
            {
                "repeat_units": list(repeat_unit_pair),
                "distribution": _prepare_genotype_distribution_histogram(
                    _get_total_histogram(
                        _filter_genotype_distribution_histogram(
                            locus["AlleleCountScatterPlot"], repeat_units=repeat_unit_pair
                        )
                    )
                ),
                "populations": sorted(
                    list(
                        itertools.chain.from_iterable(
                            [
                                {
                                    "id": population,
                                    "distribution": _prepare_genotype_distribution_histogram(
                                        _get_total_histogram(
                                            _filter_genotype_distribution_histogram(
                                                locus["AlleleCountScatterPlot"],
                                                repeat_units=repeat_unit_pair,
                                                population=population,
                                            )
                                        )
                                    ),
                                },
                                {
                                    "id": f"{population}_XX",
                                    "distribution": _prepare_genotype_distribution_histogram(
                                        _get_total_histogram(
                                            _filter_genotype_distribution_histogram(
                                                locus["AlleleCountScatterPlot"],
                                                repeat_units=repeat_unit_pair,
                                                population=population,
                                                sex="XX",
                                            )
                                        )
                                    ),
                                },
                                {
                                    "id": f"{population}_XY",
                                    "distribution": _prepare_genotype_distribution_histogram(
                                        _get_total_histogram(
                                            _filter_genotype_distribution_histogram(
                                                locus["AlleleCountScatterPlot"],
                                                repeat_units=repeat_unit_pair,
                                                population=population,
                                                sex="XY",
                                            )
                                        )
                                    ),
                                },
                            ]
                            for population in populations
                        )
                    )
                    + [
                        {
                            "id": sex,
                            "distribution": _prepare_genotype_distribution_histogram(
                                _get_total_histogram(
                                    _filter_genotype_distribution_histogram(
                                        locus["AlleleCountScatterPlot"], repeat_units=repeat_unit_pair, sex=sex
                                    )
                                )
                            ),
                        }
                        for sex in ["XX", "XY"]
                    ],
                    key=_population_sort_key,
                ),
            }
            for repeat_unit_pair in repeat_unit_pairs
        ],
        key=lambda r: (
            len(r["repeat_units"][0]),
            len(r["repeat_units"][1]),
            r["repeat_units"][0],
            r["repeat_units"][1],
        ),
    )

    return [distribution for distribution in distributions if distribution["distribution"]]


def _prepare_disease_repeat_size_classifications(disease):
    ranges = []

    if "NormalMax" in disease:
        ranges.append({"classification": "Normal", "min": None, "max": disease["NormalMax"]})

    if "IntermediateRange" in disease:
        [intermediate_min, intermediate_max] = [int(n) for n in disease["IntermediateRange"].split("-")]
        ranges.append({"classification": "Intermediate", "min": intermediate_min, "max": intermediate_max})

    ranges.append({"classification": "Pathogenic", "min": disease["PathogenicMin"], "max": None})

    return ranges


INHERITANCE_MODES = {
    "AD": "Autosomal dominant",
    "AR": "Autosomal recessive",
    "XD": "X-linked dominant",
    "XR": "X-linked recessive",
}


def prepare_gnomad_v3_short_tandem_repeats(path):
    with hl.hadoop_open(path) as input_file:
        data = json.load(input_file)

    ds = [
        {
            "id": locus["LocusId"],
            "gene": {"ensembl_id": locus["GeneId"], "symbol": locus["GeneName"], "region": locus["GeneRegion"]},
            "associated_diseases": [
                {
                    # ’ characters get garbled somewhere in ES or ES-Hadoop
                    "name": disease["Name"].replace("’", "'"),
                    "symbol": disease["Symbol"],
                    "omim_id": disease.get("OMIM", None),
                    "inheritance_mode": INHERITANCE_MODES[disease["Inheritance"]],
                    "repeat_size_classifications": _prepare_disease_repeat_size_classifications(disease),
                }
                for disease in locus["Diseases"]
            ],
            "stripy_id": locus["STRipyName"] if "STRipyName" in locus else None,
            "reference_region": {"reference_genome": "GRCh38", **_parse_region_id(locus["ReferenceRegion"])},
            "reference_repeat_unit": locus["ReferenceRepeatUnit"],
            "repeat_units": sorted(
                (
                    {
                        "repeat_unit": repeat_unit,
                        # Loci with only one repeat unit do not have a RepeatUnitClassification field.
                        # In those cases, the repeat unit is pathogenic.
                        "classification": locus["RepeatUnitClassification"].get(repeat_unit, "unknown").lower()
                        if "RepeatUnitClassification" in locus
                        else "pathogenic",
                    }
                    for repeat_unit in set(k.split("/")[2] for k in locus["AlleleCountHistogram"].keys())
                ),
                key=lambda r: (len(r["repeat_unit"]), r["repeat_unit"]),
            ),
            "allele_size_distribution": {
                "distribution": _prepare_histogram(_get_total_histogram(locus["AlleleCountHistogram"])),
                "populations": _prepare_allele_size_distribution_populations(locus),
                "repeat_units": _prepare_allele_size_distribution_repeat_units(locus),
            },
            "genotype_distribution": {
                "distribution": _prepare_genotype_distribution_histogram(
                    _get_total_histogram(locus["AlleleCountScatterPlot"])
                ),
                "populations": _prepare_genotype_distribution_populations(locus),
                "repeat_units": _prepare_genotype_distribution_repeat_units(locus),
            },
            "age_distribution": _prepare_age_distribution(locus),
            "adjacent_repeats": sorted(
                [
                    {
                        "id": adjacent_repeat_id,
                        "reference_region": {
                            "reference_genome": "GRCh38",
                            **_parse_region_id(adjacent_repeat["ReferenceRegion"]),
                        },
                        "reference_repeat_unit": adjacent_repeat["ReferenceRepeatUnit"],
                        "repeat_units": sorted(
                            set(k.split("/")[2] for k in adjacent_repeat["AlleleCountHistogram"].keys()),
                            key=lambda repeat_unit: (len(repeat_unit), repeat_unit),
                        ),
                        "allele_size_distribution": {
                            "distribution": _prepare_histogram(
                                _get_total_histogram(adjacent_repeat["AlleleCountHistogram"])
                            ),
                            "populations": _prepare_allele_size_distribution_populations(adjacent_repeat),
                            "repeat_units": _prepare_allele_size_distribution_repeat_units(adjacent_repeat),
                        },
                        "genotype_distribution": {
                            "distribution": _prepare_genotype_distribution_histogram(
                                _get_total_histogram(adjacent_repeat["AlleleCountScatterPlot"])
                            ),
                            "populations": _prepare_genotype_distribution_populations(adjacent_repeat),
                            "repeat_units": _prepare_genotype_distribution_repeat_units(adjacent_repeat),
                        },
                        "age_distribution": _prepare_age_distribution(adjacent_repeat),
                    }
                    for adjacent_repeat_id, adjacent_repeat in locus.get("AdjacentRepeats", {}).items()
                ],
                key=lambda repeat: repeat["id"],
            ),
        }
        for locus in data.values()
    ]

    return hl.Table.parallelize(
        ds,
        hl.tstruct(
            id=hl.tstr,
            gene=hl.tstruct(ensembl_id=hl.tstr, symbol=hl.tstr, region=hl.tstr),
            associated_diseases=hl.tarray(
                hl.tstruct(
                    name=hl.tstr,
                    symbol=hl.tstr,
                    omim_id=hl.tstr,
                    inheritance_mode=hl.tstr,
                    repeat_size_classifications=hl.tarray(hl.tstruct(classification=hl.tstr, min=hl.tint, max=hl.tint)),
                )
            ),
            reference_region=hl.tstruct(reference_genome=hl.tstr, chrom=hl.tstr, start=hl.tint, stop=hl.tint),
            reference_repeat_unit=hl.tstr,
            repeat_units=hl.tarray(hl.tstruct(repeat_unit=hl.tstr, classification=hl.tstr)),
            allele_size_distribution=hl.tstruct(
                distribution=hl.tarray(hl.tarray(hl.tint)),
                populations=hl.tarray(hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))),
                repeat_units=hl.tarray(
                    hl.tstruct(
                        repeat_unit=hl.tstr,
                        distribution=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))),
                    )
                ),
            ),
            genotype_distribution=hl.tstruct(
                distribution=hl.tarray(hl.tarray(hl.tint)),
                populations=hl.tarray(hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))),
                repeat_units=hl.tarray(
                    hl.tstruct(
                        repeat_units=hl.tarray(hl.tstr),
                        distribution=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))),
                    )
                ),
            ),
            age_distribution=hl.tarray(
                hl.tstruct(age_range=hl.tarray(hl.tint), distribution=hl.tarray(hl.tarray(hl.tint)))
            ),
            stripy_id=hl.tstr,
            adjacent_repeats=hl.tarray(
                hl.tstruct(
                    id=hl.tstr,
                    reference_region=hl.tstruct(reference_genome=hl.tstr, chrom=hl.tstr, start=hl.tint, stop=hl.tint),
                    reference_repeat_unit=hl.tstr,
                    repeat_units=hl.tarray(hl.tstr),
                    allele_size_distribution=hl.tstruct(
                        distribution=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))),
                        repeat_units=hl.tarray(
                            hl.tstruct(
                                repeat_unit=hl.tstr,
                                distribution=hl.tarray(hl.tarray(hl.tint)),
                                populations=hl.tarray(
                                    hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))
                                ),
                            )
                        ),
                    ),
                    genotype_distribution=hl.tstruct(
                        distribution=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))),
                        repeat_units=hl.tarray(
                            hl.tstruct(
                                repeat_units=hl.tarray(hl.tstr),
                                distribution=hl.tarray(hl.tarray(hl.tint)),
                                populations=hl.tarray(
                                    hl.tstruct(id=hl.tstr, distribution=hl.tarray(hl.tarray(hl.tint)))
                                ),
                            )
                        ),
                    ),
                    age_distribution=hl.tarray(
                        hl.tstruct(age_range=hl.tarray(hl.tint), distribution=hl.tarray(hl.tarray(hl.tint)))
                    ),
                )
            ),
        ),
        n_partitions=1,
    )

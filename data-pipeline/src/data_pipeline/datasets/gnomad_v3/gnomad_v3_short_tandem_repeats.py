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


def _prepare_populations(locus):
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountHistogram"].keys()))

    return sorted(
        list(
            itertools.chain.from_iterable(
                [
                    {
                        "id": population,
                        "repeats": _prepare_histogram(
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
                        "repeats": _prepare_histogram(
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
                        "repeats": _prepare_histogram(
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
                "repeats": _prepare_histogram(
                    _get_total_histogram(
                        {k: v for k, v in locus["AlleleCountHistogram"].items() if k.split("/")[1] == sex}
                    )
                ),
            }
            for sex in ["XX", "XY"]
        ],
        key=_population_sort_key,
    )


def _prepare_repeat_units(locus):
    repeat_units = sorted(set(key.split("/")[2] for key in locus["AlleleCountHistogram"].keys()))
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountHistogram"].keys()))

    return sorted(
        [
            {
                "repeat_unit": repeat_unit,
                "repeats": _prepare_histogram(
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
                                    "repeats": _prepare_histogram(
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
                                    "repeats": _prepare_histogram(
                                        locus["AlleleCountHistogram"][f"{population}/XX/{repeat_unit}"]
                                    )
                                    if f"{population}/XX/{repeat_unit}" in locus["AlleleCountHistogram"]
                                    else [],
                                },
                                {
                                    "id": f"{population}_XY",
                                    "repeats": _prepare_histogram(
                                        locus["AlleleCountHistogram"][f"{population}/XY/{repeat_unit}"]
                                    )
                                    if f"{population}/XY/{repeat_unit}" in locus["AlleleCountHistogram"]
                                    else [],
                                },
                            ]
                            for population in populations
                        )
                    )
                    + [
                        {
                            "id": sex,
                            "repeats": _prepare_histogram(
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


def _prepare_repeat_cooccurrence_histogram(histogram):
    return sorted(
        ([*(int(n) for n in n_repeats.split("/")), n_samples] for n_repeats, n_samples in histogram.items()),
        key=lambda value: (value[0], value[1]),
    )


def _prepare_repeat_cooccurrence_populations(locus):
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountScatterPlot"].keys()))

    return sorted(
        list(
            itertools.chain.from_iterable(
                [
                    {
                        "id": population,
                        "repeats": _prepare_repeat_cooccurrence_histogram(
                            _get_total_histogram(
                                {
                                    k: v
                                    for k, v in locus["AlleleCountScatterPlot"].items()
                                    if k.split("/")[0] == population
                                }
                            )
                        ),
                    },
                    {
                        "id": f"{population}_XX",
                        "repeats": _prepare_repeat_cooccurrence_histogram(
                            _get_total_histogram(
                                {
                                    k: v
                                    for k, v in locus["AlleleCountScatterPlot"].items()
                                    if k.split("/")[0] == population and k.split("/")[1] == "XX"
                                }
                            )
                        ),
                    },
                    {
                        "id": f"{population}_XY",
                        "repeats": _prepare_repeat_cooccurrence_histogram(
                            _get_total_histogram(
                                {
                                    k: v
                                    for k, v in locus["AlleleCountScatterPlot"].items()
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
                "repeats": _prepare_repeat_cooccurrence_histogram(
                    _get_total_histogram(
                        {k: v for k, v in locus["AlleleCountScatterPlot"].items() if k.split("/")[1] == sex}
                    )
                ),
            }
            for sex in ["XX", "XY"]
        ],
        key=_population_sort_key,
    )


def _prepare_repeat_cooccurrence_repeat_units(locus):
    repeat_unit_pairs = sorted(set(key.split("/", maxsplit=2)[2] for key in locus["AlleleCountScatterPlot"].keys()))
    populations = sorted(set(key.split("/")[0] for key in locus["AlleleCountScatterPlot"].keys()))

    return sorted(
        [
            {
                "repeat_units": repeat_unit_pair.split("/"),
                "repeats": _prepare_repeat_cooccurrence_histogram(
                    _get_total_histogram(
                        {
                            k: v
                            for k, v in locus["AlleleCountScatterPlot"].items()
                            if k.split("/", maxsplit=2)[2] == repeat_unit_pair
                        }
                    )
                ),
                "populations": sorted(
                    list(
                        itertools.chain.from_iterable(
                            [
                                {
                                    "id": population,
                                    "repeats": _prepare_repeat_cooccurrence_histogram(
                                        _get_total_histogram(
                                            {
                                                k: v
                                                for k, v in locus["AlleleCountScatterPlot"].items()
                                                if k.split("/", maxsplit=2)[2] == repeat_unit_pair
                                                and k.split("/")[0] == population
                                            }
                                        )
                                    ),
                                },
                                {
                                    "id": f"{population}_XX",
                                    "repeats": _prepare_repeat_cooccurrence_histogram(
                                        locus["AlleleCountScatterPlot"][f"{population}/XX/{repeat_unit_pair}"]
                                    )
                                    if f"{population}/XX/{repeat_unit_pair}" in locus["AlleleCountScatterPlot"]
                                    else [],
                                },
                                {
                                    "id": f"{population}_XY",
                                    "repeats": _prepare_repeat_cooccurrence_histogram(
                                        locus["AlleleCountScatterPlot"][f"{population}/XY/{repeat_unit_pair}"]
                                    )
                                    if f"{population}/XY/{repeat_unit_pair}" in locus["AlleleCountScatterPlot"]
                                    else [],
                                },
                            ]
                            for population in populations
                        )
                    )
                    + [
                        {
                            "id": sex,
                            "repeats": _prepare_repeat_cooccurrence_histogram(
                                _get_total_histogram(
                                    {
                                        k: v
                                        for k, v in locus["AlleleCountScatterPlot"].items()
                                        if k.split("/", maxsplit=2)[2] == repeat_unit_pair and k.split("/")[1] == sex
                                    }
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


def prepare_gnomad_v3_short_tandem_repeats(path):
    with hl.hadoop_open(path) as input_file:
        data = json.load(input_file)

    ds = [
        {
            "id": locus["LocusId"],
            "gene": {"ensembl_id": locus["GeneId"], "symbol": locus["GeneName"], "region": locus["GeneRegion"]},
            "inheritance_mode": locus["InheritanceMode"],
            "associated_disease": {
                # ’ characters get garbled somewhere in ES or ES-Hadoop
                "name": locus["Disease"].replace("’", "'"),
                "omim_id": locus["OMIMDiseaseLink"].split("/")[-1] if locus["OMIMDiseaseLink"] else None,
                "normal_threshold": int(locus["NormalMax"]) if locus["NormalMax"] is not None else None,
                "pathogenic_threshold": int(locus["PathogenicMin"]) if locus["PathogenicMin"] is not None else None,
            },
            "stripy_id": locus["STRipyLink"].split("/")[-1] if "STRipyLink" in locus else None,
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
            "repeat_counts": {
                "total": _prepare_histogram(_get_total_histogram(locus["AlleleCountHistogram"])),
                "populations": _prepare_populations(locus),
                "repeat_units": _prepare_repeat_units(locus),
            },
            "repeat_cooccurrence": {
                "total": _prepare_repeat_cooccurrence_histogram(_get_total_histogram(locus["AlleleCountScatterPlot"])),
                "populations": _prepare_repeat_cooccurrence_populations(locus),
                "repeat_units": _prepare_repeat_cooccurrence_repeat_units(locus),
            },
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
                        "repeat_counts": {
                            "total": _prepare_histogram(_get_total_histogram(adjacent_repeat["AlleleCountHistogram"])),
                            "populations": _prepare_populations(adjacent_repeat),
                            "repeat_units": _prepare_repeat_units(adjacent_repeat),
                        },
                        "repeat_cooccurrence": {
                            "total": _prepare_repeat_cooccurrence_histogram(
                                _get_total_histogram(adjacent_repeat["AlleleCountScatterPlot"])
                            ),
                            "populations": _prepare_repeat_cooccurrence_populations(adjacent_repeat),
                            "repeat_units": _prepare_repeat_cooccurrence_repeat_units(adjacent_repeat),
                        },
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
            inheritance_mode=hl.tstr,
            associated_disease=hl.tstruct(
                name=hl.tstr, omim_id=hl.tstr, normal_threshold=hl.tint, pathogenic_threshold=hl.tint
            ),
            reference_region=hl.tstruct(reference_genome=hl.tstr, chrom=hl.tstr, start=hl.tint, stop=hl.tint),
            reference_repeat_unit=hl.tstr,
            repeat_units=hl.tarray(hl.tstruct(repeat_unit=hl.tstr, classification=hl.tstr)),
            repeat_counts=hl.tstruct(
                total=hl.tarray(hl.tarray(hl.tint)),
                populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                repeat_units=hl.tarray(
                    hl.tstruct(
                        repeat_unit=hl.tstr,
                        repeats=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                    )
                ),
            ),
            repeat_cooccurrence=hl.tstruct(
                total=hl.tarray(hl.tarray(hl.tint)),
                populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                repeat_units=hl.tarray(
                    hl.tstruct(
                        repeat_units=hl.tarray(hl.tstr),
                        repeats=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                    )
                ),
            ),
            stripy_id=hl.tstr,
            adjacent_repeats=hl.tarray(
                hl.tstruct(
                    id=hl.tstr,
                    reference_region=hl.tstruct(reference_genome=hl.tstr, chrom=hl.tstr, start=hl.tint, stop=hl.tint),
                    reference_repeat_unit=hl.tstr,
                    repeat_units=hl.tarray(hl.tstr),
                    repeat_counts=hl.tstruct(
                        total=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                        repeat_units=hl.tarray(
                            hl.tstruct(
                                repeat_unit=hl.tstr,
                                repeats=hl.tarray(hl.tarray(hl.tint)),
                                populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                            )
                        ),
                    ),
                    repeat_cooccurrence=hl.tstruct(
                        total=hl.tarray(hl.tarray(hl.tint)),
                        populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                        repeat_units=hl.tarray(
                            hl.tstruct(
                                repeat_units=hl.tarray(hl.tstr),
                                repeats=hl.tarray(hl.tarray(hl.tint)),
                                populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                            )
                        ),
                    ),
                )
            ),
        ),
        n_partitions=1,
    )

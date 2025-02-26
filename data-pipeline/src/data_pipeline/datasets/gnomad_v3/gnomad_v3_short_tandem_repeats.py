import json

import hail as hl


def _parse_region_id(region_id):
    [chrom, position_range] = region_id.split(":")
    chrom = chrom[3:]
    [start, stop] = list(map(int, position_range.split("-")))
    return {"chrom": chrom, "start": start, "stop": stop, "reference_genome": "GRCh38"}


def _prepare_histogram(histogram):
    return sorted(
        ([int(n_repeats), n_samples] for n_repeats, n_samples in histogram.items()),
        key=lambda value: value[0],
    )


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


def _parse_allele_count_histogram_section(cohort_key, distribution):
    [ancestry_group, sex, repunit, quality_description, q_score] = cohort_key.split("/")
    return {
        "ancestry_group": ancestry_group,
        "sex": sex,
        "repunit": repunit,
        "quality_description": quality_description.lower(),
        "q_score": float(q_score),
        "distribution": [{"repunit_count": int(k), "frequency": v} for k, v in distribution.items()],
    }


def _prepare_allele_size_distribution(allele_count_histogram):
    return [_parse_allele_count_histogram_section(k, v) for (k, v) in allele_count_histogram.items()]


def _parse_allele_scatter_plot_item(item):
    (key, value) = item
    [short_allele_repunit_count, long_allele_repunit_count] = key.split("/")
    return {
        "short_allele_repunit_count": int(short_allele_repunit_count),
        "long_allele_repunit_count": int(long_allele_repunit_count),
        "frequency": value,
    }


def _parse_allele_scatter_plot_distribution(distribution):
    return list(map(_parse_allele_scatter_plot_item, distribution.items()))


def _parse_allele_scatter_plot_histogram_section(cohort_key, distribution):
    [ancestry_group, sex, short_allele_repunit, long_allele_repunit, quality_description, q_score] = cohort_key.split(
        "/"
    )
    return {
        "ancestry_group": ancestry_group,
        "sex": sex,
        "short_allele_repunit": short_allele_repunit,
        "long_allele_repunit": long_allele_repunit,
        "quality_description": quality_description,
        "q_score": float(q_score),
        "distribution": _parse_allele_scatter_plot_distribution(distribution),
    }


def _prepare_genotype_distribution(allele_scatter_plot_histogram):
    return [_parse_allele_scatter_plot_histogram_section(k, v) for k, v in allele_scatter_plot_histogram.items()]


def _parse_reference_regions(regions):
    # "regions" may be a single string or list of strings

    if isinstance(regions, str):
        return [_parse_region_id(regions)]
    return list(map(_parse_region_id, regions))


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
                    "notes": disease.get("Note", None),
                }
                for disease in locus["Diseases"]
            ],
            "stripy_id": locus["STRipyName"] if "STRipyName" in locus else None,
            "main_reference_region": _parse_region_id(locus["MainReferenceRegion"]),
            "reference_regions": _parse_reference_regions(locus["ReferenceRegion"]),
            "reference_repeat_unit": locus["ReferenceRepeatUnit"],
            "repeat_units": sorted(
                (
                    {
                        "repeat_unit": repeat_unit,
                        # Loci with only one repeat unit do not have a RepeatUnitClassification field.
                        # In those cases, the repeat unit is pathogenic.
                        "classification": (
                            locus["RepeatUnitClassification"].get(repeat_unit, "unknown").lower()
                            if "RepeatUnitClassification" in locus
                            else "pathogenic"
                        ),
                    }
                    for repeat_unit in (
                        set(k.split("/")[2] for k in locus["AlleleCountHistogram"].keys())
                        | set(locus.get("RepeatUnitClassification", {}).keys())
                    )
                ),
                key=lambda r: (len(r["repeat_unit"]), r["repeat_unit"]),
            ),
            "allele_size_distribution": _prepare_allele_size_distribution(locus["AlleleCountHistogram"]),
            "genotype_distribution": _prepare_genotype_distribution(locus["AlleleCountScatterPlot"]),
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
                        "allele_size_distribution": _prepare_allele_size_distribution(
                            adjacent_repeat["AlleleCountHistogram"]
                        ),
                        "genotype_distribution": _prepare_genotype_distribution(
                            adjacent_repeat["AlleleCountScatterPlot"]
                        ),
                        "age_distribution": _prepare_age_distribution(adjacent_repeat),
                    }
                    for adjacent_repeat_id, adjacent_repeat in locus.get("AdjacentRepeats", {}).items()
                ],
                key=lambda repeat: repeat["id"],
            ),
        }
        for locus in data.values()
    ]

    allele_size_distribution_schema = hl.tarray(
        hl.tstruct(
            ancestry_group=hl.tstr,
            sex=hl.tstr,
            repunit=hl.tstr,
            quality_description=hl.tstr,
            q_score=hl.tfloat,
            distribution=hl.tarray(hl.tstruct(repunit_count=hl.tint, frequency=hl.tint)),
        )
    )
    genotype_distribution_schema = hl.tarray(
        hl.tstruct(
            ancestry_group=hl.tstr,
            sex=hl.tstr,
            short_allele_repunit=hl.tstr,
            long_allele_repunit=hl.tstr,
            quality_description=hl.tstr,
            q_score=hl.tfloat,
            distribution=hl.tarray(
                hl.tstruct(short_allele_repunit_count=hl.tint, long_allele_repunit_count=hl.tint, frequency=hl.tfloat)
            ),
        )
    )

    ds = hl.Table.parallelize(
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
                    notes=hl.tstr,
                )
            ),
            main_reference_region=hl.tstruct(reference_genome=hl.tstr, chrom=hl.tstr, start=hl.tint, stop=hl.tint),
            reference_regions=hl.tarray(
                hl.tstruct(reference_genome=hl.tstr, chrom=hl.tstr, start=hl.tint, stop=hl.tint)
            ),
            reference_repeat_unit=hl.tstr,
            repeat_units=hl.tarray(hl.tstruct(repeat_unit=hl.tstr, classification=hl.tstr)),
            allele_size_distribution=allele_size_distribution_schema,
            genotype_distribution=genotype_distribution_schema,
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
                    allele_size_distribution=allele_size_distribution_schema,
                    genotype_distribution=genotype_distribution_schema,
                    age_distribution=hl.tarray(
                        hl.tstruct(age_range=hl.tarray(hl.tint), distribution=hl.tarray(hl.tarray(hl.tint)))
                    ),
                )
            ),
        ),
        n_partitions=1,
    )
    return ds

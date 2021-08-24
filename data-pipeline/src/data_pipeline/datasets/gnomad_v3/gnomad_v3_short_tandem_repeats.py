import json

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


def _prepare_str_variant(variant):
    populations = [pop_id for pop_id in variant["AlleleCountHistogram"].keys() if pop_id != "Total"]
    return {
        "region": {"reference_genome": "GRCh38", **_parse_region_id(variant["ReferenceRegion"])},
        "repeat_unit": variant["RepeatUnit"],
        "repeats": _prepare_histogram(variant["AlleleCountHistogram"]["Total"]),
        "populations": sorted(
            [
                {"id": pop_id.replace("/", "_"), "repeats": _prepare_histogram(variant["AlleleCountHistogram"][pop_id])}
                for pop_id in populations
            ],
            key=_population_sort_key,
        ),
    }


def prepare_gnomad_v3_short_tandem_repeats(path):
    with hl.hadoop_open(path) as input_file:
        data = json.load(input_file)

    ds = [
        {
            "locus_id": locus["LocusId"],
            "gene": {"ensembl_id": locus["GeneId"], "symbol": locus["GeneName"], "region": locus["GeneRegion"]},
            "inheritance_mode": locus["InheritanceMode"],
            "associated_disease": {
                # ’ characters get garbled somewhere in ES or ES-Hadoop
                "name": locus["Disease"].replace("’", "'"),
                "omim_id": locus["OMIMDiseaseLink"].split("/")[-1],
                "benign_threshold": int(locus["NormalMax"]),
                "pathogenic_threshold": int(locus["PathologicMin"]),
            },
            "stripy_id": locus["STRipyLink"].split("/")[-1],
            "variants": [
                {"id": variant_id, **_prepare_str_variant(variant)}
                for variant_id, variant in locus["VariantId"].items()
            ],
        }
        for locus in data.values()
    ]

    return hl.Table.parallelize(
        ds,
        hl.tstruct(
            locus_id=hl.tstr,
            gene=hl.tstruct(ensembl_id=hl.tstr, symbol=hl.tstr, region=hl.tstr),
            inheritance_mode=hl.tstr,
            associated_disease=hl.tstruct(
                name=hl.tstr, omim_id=hl.tstr, benign_threshold=hl.tint, pathogenic_threshold=hl.tint
            ),
            stripy_id=hl.tstr,
            variants=hl.tarray(
                hl.tstruct(
                    id=hl.tstr,
                    region=hl.tstruct(reference_genome=hl.tstr, chrom=hl.tstr, start=hl.tint, stop=hl.tint),
                    repeat_unit=hl.tstr,
                    repeats=hl.tarray(hl.tarray(hl.tint)),
                    populations=hl.tarray(hl.tstruct(id=hl.tstr, repeats=hl.tarray(hl.tarray(hl.tint)))),
                )
            ),
        ),
        n_partitions=1,
    )

import csv
import datetime
import gzip
import json
import os
import subprocess
import sys
from xml.etree import ElementTree

import hail as hl
from tqdm import tqdm

from data_pipeline.data_types.locus import normalized_contig
from data_pipeline.data_types.variant import variant_id


CLINVAR_GOLD_STARS = {
    "criteria provided, conflicting interpretations": 1,
    "criteria provided, multiple submitters, no conflicts": 2,
    "criteria provided, single submitter": 1,
    "no assertion criteria provided": 0,
    "no assertion provided": 0,
    "no interpretation for the single variant": 0,
    "practice guideline": 4,
    "reviewed by expert panel": 3,
}


class SkipVariant(Exception):
    pass


def _parse_submission(submission_element, trait_mapping_list_element):
    submission = {}

    submission["id"] = submission_element.find("./ClinVarAccession").attrib["Accession"]

    submission["submitter_name"] = submission_element.find("./ClinVarAccession").attrib["SubmitterName"]

    submission["clinical_significance"] = None
    interpretation_element = submission_element.find("./Interpretation")
    interpretation_description_element = interpretation_element.find("./Description")
    if interpretation_description_element is not None:
        submission["clinical_significance"] = interpretation_description_element.text

    submission["last_evaluated"] = interpretation_element.attrib.get("DateLastEvaluated", None)
    submission["review_status"] = submission_element.find("./ReviewStatus").text

    submission["conditions"] = []
    trait_elements = submission_element.findall("./TraitSet/Trait")
    for trait_element in trait_elements:
        preferred_name_element = None
        mapping_element = None

        if trait_mapping_list_element is not None:
            xref_elements = trait_element.findall("XRef")
            for xref_element in xref_elements:
                selector = f"./TraitMapping[@ClinicalAssertionID='{submission_element.attrib['ID']}'][@TraitType='{trait_element.attrib['Type']}'][@MappingType='XRef'][@MappingValue='{xref_element.attrib['ID']}']"
                mapping_element = trait_mapping_list_element.find(selector)
                if mapping_element is not None:
                    break

        if mapping_element is None:
            preferred_name_element = trait_element.find("./Name/ElementValue[@Type='Preferred']")
            if preferred_name_element is not None and trait_mapping_list_element is not None:
                selector = f"./TraitMapping[@ClinicalAssertionID='{submission_element.attrib['ID']}'][@TraitType='{trait_element.attrib['Type']}'][@MappingType='Name'][@MappingValue=\"{preferred_name_element.text}\"]"
                mapping_element = trait_mapping_list_element.find(selector)

        if mapping_element is None:
            name_elements = trait_element.findall("./Name/ElementValue")
            for name_element in name_elements:
                if preferred_name_element is None:
                    preferred_name_element = name_element

                if trait_mapping_list_element is not None:
                    selector = f"./TraitMapping[@ClinicalAssertionID='{submission_element.attrib['ID']}'][@TraitType='{trait_element.attrib['Type']}'][@MappingType='Name'][@MappingValue=\"{name_element.text}\"]"
                    mapping_element = trait_mapping_list_element.find(selector)
                    if mapping_element:
                        break

        if mapping_element is not None:
            medgen_element = mapping_element.find("./MedGen")
            submission["conditions"].append(
                {"name": medgen_element.attrib["Name"], "medgen_id": medgen_element.attrib["CUI"],}
            )
        elif preferred_name_element is not None:
            submission["conditions"].append({"name": preferred_name_element.text, "medgen_id": None})

    return submission


def _parse_variant(variant_element):
    variant = {}

    if variant_element.find("./InterpretedRecord") is None:
        raise SkipVariant

    variant["locations"] = {}
    location_elements = variant_element.findall("./InterpretedRecord/SimpleAllele/Location/SequenceLocation")
    for element in location_elements:
        try:
            variant["locations"][element.attrib["Assembly"]] = {
                "locus": element.attrib["Chr"] + ":" + element.attrib["positionVCF"],
                "alleles": [element.attrib["referenceAlleleVCF"], element.attrib["alternateAlleleVCF"],],
            }
        except KeyError:
            pass

    if not variant["locations"]:
        raise SkipVariant

    variant["clinvar_variation_id"] = variant_element.attrib["VariationID"]

    variant["rsid"] = None
    rsid_element = variant_element.find("./InterpretedRecord/SimpleAllele/XRefList/XRef[@DB='dbSNP']")
    if rsid_element is not None:
        variant["rsid"] = rsid_element.attrib["ID"]

    review_status_element = variant_element.find("./InterpretedRecord/ReviewStatus")
    variant["review_status"] = review_status_element.text
    variant["gold_stars"] = CLINVAR_GOLD_STARS[variant["review_status"]]

    variant["clinical_significance"] = None
    clinical_significance_elements = variant_element.findall(
        "./InterpretedRecord/Interpretations/Interpretation[@Type='Clinical significance']"
    )
    if clinical_significance_elements:
        variant["clinical_significance"] = ", ".join(
            el.find("Description").text for el in clinical_significance_elements
        )

    variant["last_evaluated"] = None
    evaluated_dates = [el.attrib.get("DateLastEvaluated", None) for el in clinical_significance_elements]
    evaluated_dates = [date for date in evaluated_dates if date]
    if evaluated_dates:
        variant["last_evaluated"] = sorted(
            evaluated_dates, key=lambda date: datetime.datetime.strptime(date, "%Y-%m-%d"), reverse=True,
        )[0]

    submission_elements = variant_element.findall("./InterpretedRecord/ClinicalAssertionList/ClinicalAssertion")
    trait_mapping_list_element = variant_element.find("./InterpretedRecord/TraitMappingList")
    variant["submissions"] = [_parse_submission(el, trait_mapping_list_element) for el in submission_elements]

    return variant


def import_clinvar_xml(clinvar_xml_path):
    release_date = None

    clinvar_xml_local_path = os.path.join("/tmp", os.path.basename(clinvar_xml_path))
    print("Copying ClinVar XML")
    if not os.path.exists(clinvar_xml_local_path):
        subprocess.check_call(["gsutil", "cp", clinvar_xml_path, clinvar_xml_local_path])

    print("Parsing XML file")
    with open("/tmp/clinvar_variants.tsv", "w", newline="") as output_file:
        writer = csv.writer(output_file, delimiter="\t", quotechar="", quoting=csv.QUOTE_NONE)
        writer.writerow(["locus_GRCh37", "alleles_GRCh37", "locus_GRCh38", "alleles_GRCh38", "variant"])

        open_file = gzip.open if clinvar_xml_local_path.endswith(".gz") else open
        with open_file(clinvar_xml_local_path, "r") as xml_file:
            # 800k is an estimate of the number of variants in the XML file
            progress = tqdm(total=800_000, mininterval=5)

            xml = ElementTree.iterparse(xml_file, events=["end"])
            for _, element in xml:
                if element.tag == "ClinVarVariationRelease":
                    release_date = element.attrib["ReleaseDate"]

                if element.tag == "VariationArchive":
                    try:
                        variant = _parse_variant(element)

                        locations = variant.pop("locations")
                        writer.writerow(
                            [
                                locations["GRCh37"]["locus"] if "GRCh37" in locations else "NA",
                                json.dumps(locations["GRCh37"]["alleles"]) if "GRCh37" in locations else "NA",
                                "chr" + locations["GRCh38"]["locus"].replace("MT", "M")
                                if "GRCh38" in locations
                                else "NA",
                                json.dumps(locations["GRCh38"]["alleles"]) if "GRCh38" in locations else "NA",
                                json.dumps(variant),
                            ]
                        )

                        progress.update(1)

                    except SkipVariant:
                        pass
                    except Exception:
                        print(
                            f"Failed to parse variant {element.attrib['VariationID']}", file=sys.stderr,
                        )
                        raise

                    # https://stackoverflow.com/questions/7697710/python-running-out-of-memory-parsing-xml-using-celementtree-iterparse
                    element.clear()

            progress.close()

    subprocess.check_call(["hdfs", "dfs", "-cp", "-f", "file:///tmp/clinvar_variants.tsv", "/tmp/clinvar_variants.tsv"])

    ds = hl.import_table(
        "/tmp/clinvar_variants.tsv",
        types={
            "locus_GRCh37": hl.tlocus("GRCh37"),
            "alleles_GRCh37": hl.tarray(hl.tstr),
            "locus_GRCh38": hl.tlocus("GRCh38"),
            "alleles_GRCh38": hl.tarray(hl.tstr),
            "variant": hl.tstruct(
                clinvar_variation_id=hl.tstr,
                rsid=hl.tstr,
                review_status=hl.tstr,
                gold_stars=hl.tint,
                clinical_significance=hl.tstr,
                last_evaluated=hl.tstr,
                submissions=hl.tarray(
                    hl.tstruct(
                        id=hl.tstr,
                        submitter_name=hl.tstr,
                        clinical_significance=hl.tstr,
                        last_evaluated=hl.tstr,
                        review_status=hl.tstr,
                        conditions=hl.tarray(hl.tstruct(name=hl.tstr, medgen_id=hl.tstr)),
                    )
                ),
            ),
        },
        min_partitions=2000,
    )

    ds = ds.annotate_globals(clinvar_release_date=release_date)

    return ds


def prepare_clinvar_variants(clinvar_path, reference_genome):
    ds = hl.read_table(clinvar_path)

    ds = ds.filter(hl.is_defined(ds[f"locus_{reference_genome}"]) & hl.is_defined(ds[f"alleles_{reference_genome}"]))

    ds = ds.select(locus=ds[f"locus_{reference_genome}"], alleles=ds[f"alleles_{reference_genome}"], **ds.variant)

    # Remove any variants with alleles other than ACGT
    ds = ds.filter(
        hl.len(hl.set(hl.delimit(ds.alleles, "").split("")).difference(hl.set(["A", "C", "G", "T", ""]))) == 0
    )

    ds = ds.annotate(
        variant_id=variant_id(ds.locus, ds.alleles),
        reference_genome=reference_genome,
        chrom=normalized_contig(ds.locus.contig),
        pos=ds.locus.position,
        ref=ds.alleles[0],
        alt=ds.alleles[1],
    )

    ds = ds.key_by("locus", "alleles")

    return ds


def _get_gnomad_variants(gnomad_exome_variants_path=None, gnomad_genome_variants_path=None):
    gnomad_exome_variants = None
    gnomad_genome_variants = None

    if gnomad_exome_variants_path:
        gnomad_exome_variants = hl.read_table(gnomad_exome_variants_path)
        gnomad_exome_variants = gnomad_exome_variants.select(
            exome=hl.struct(
                filters=gnomad_exome_variants.filters,
                ac=gnomad_exome_variants.freq[0].AC,
                an=gnomad_exome_variants.freq[0].AN,
            )
        )

        # For purposes of marking ClinVar variants as "in gnomAD", exclude AC=0 gnomAD variants
        gnomad_exome_variants = gnomad_exome_variants.filter(gnomad_exome_variants.exome.ac > 0)

    if gnomad_genome_variants_path:
        gnomad_genome_variants = hl.read_table(gnomad_genome_variants_path)
        gnomad_genome_variants = gnomad_genome_variants.select(
            genome=hl.struct(
                filters=gnomad_genome_variants.filters,
                ac=gnomad_genome_variants.freq[0].AC,
                an=gnomad_genome_variants.freq[0].AN,
            )
        )

        # For purposes of marking ClinVar variants as "in gnomAD", exclude AC=0 gnomAD variants
        gnomad_genome_variants = gnomad_genome_variants.filter(gnomad_genome_variants.genome.ac > 0)

    gnomad_variants = None
    if gnomad_exome_variants and gnomad_genome_variants:
        gnomad_variants = gnomad_exome_variants.join(gnomad_genome_variants, how="outer")
    elif gnomad_exome_variants:
        gnomad_variants = gnomad_exome_variants.annotate(genome=hl.missing(gnomad_exome_variants.exome.dtype))
    elif gnomad_genome_variants:
        gnomad_variants = gnomad_genome_variants.annotate(exome=hl.missing(gnomad_genome_variants.genome.dtype))

    return gnomad_variants


def annotate_clinvar_variants_in_gnomad(
    clinvar_path, gnomad_exome_variants_path=None, gnomad_genome_variants_path=None
):
    gnomad_variants = _get_gnomad_variants(gnomad_exome_variants_path, gnomad_genome_variants_path)
    ds = hl.read_table(clinvar_path)
    ds = ds.annotate(gnomad=gnomad_variants[ds.key])
    ds = ds.annotate(in_gnomad=hl.is_defined(ds.gnomad))
    return ds

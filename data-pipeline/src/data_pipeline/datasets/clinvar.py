import csv
import gzip
import json
import os
import subprocess
import sys
from xml.etree import ElementTree
from xml.sax.saxutils import quoteattr

import hail as hl
from tqdm import tqdm

from data_pipeline.datasets.gnomad_v3.gnomad_v3_mitochondrial_variants import (
    FILTER_NAMES as MITOCHONDRIAL_VARIANT_FILTER_NAMES,
)
from data_pipeline.data_types.locus import normalized_contig
from data_pipeline.data_types.variant import variant_id


CLINVAR_XML_URL = "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/xml/ClinVarVCVRelease_00-latest.xml.gz"

CLINVAR_GOLD_STARS = {
    None: 0,
    "no classification for the single variant": 0,
    "no interpretation for the single variant": 0,
    "no classification provided": 0,
    "no assertion provided": 0,
    "no classifications from unflagged records": 0,
    "no assertion criteria provided": 0,
    "criteria provided, single submitter": 1,
    "criteria provided, conflicting classifications": 1,
    "criteria provided, conflicting interpretations": 1,
    "criteria provided, multiple submitters, no conflicts": 2,
    "reviewed by expert panel": 3,
    "practice guideline": 4,
}


def find_mapping_elements_by_xref(trait_element, submission_element, trait_mapping_list_element):
    if trait_mapping_list_element is None:
        return None

    xref_elements = trait_element.findall("XRef")
    for xref_element in xref_elements:
        selector = f"./TraitMapping[@ClinicalAssertionID='{submission_element.attrib['ID']}'][@TraitType='{trait_element.attrib['Type']}'][@MappingType='XRef'][@MappingValue={quoteattr(xref_element.attrib['ID'])}]"  # noqa
        mapping_element = trait_mapping_list_element.find(selector)
        if mapping_element is not None:
            return mapping_element
    return None


def find_mapping_elements_by_preferred_name(trait_element, submission_element, trait_mapping_list_element):
    preferred_name_element = trait_element.find("./Name/ElementValue[@Type='Preferred']")

    if preferred_name_element is not None and trait_mapping_list_element is not None:
        selector = f"./TraitMapping[@ClinicalAssertionID='{submission_element.attrib['ID']}'][@TraitType='{trait_element.attrib['Type']}'][@MappingType='Name'][@MappingValue={quoteattr(preferred_name_element.text)}]"  # noqa
        mapping_element = trait_mapping_list_element.find(selector)
        return mapping_element, preferred_name_element

    return None, preferred_name_element


def find_mapping_elements_by_name(trait_element, submission_element, trait_mapping_list_element):
    name_elements = trait_element.findall("./Name/ElementValue")
    preferred_name_element = None

    for name_element in name_elements:
        if preferred_name_element is None:
            preferred_name_element = name_element

        if trait_mapping_list_element is not None:
            selector = f"./TraitMapping[@ClinicalAssertionID='{submission_element.attrib['ID']}'][@TraitType='{trait_element.attrib['Type']}'][@MappingType='Name'][@MappingValue={quoteattr(name_element.text)}]"  # noqa
            mapping_element = trait_mapping_list_element.find(selector)
            if mapping_element:
                return mapping_element, preferred_name_element

    return None, preferred_name_element


def _determine_mapping_and_preferred_name_element(trait_element, submission_element, trait_mapping_list_element):
    preferred_name_element = None
    mapping_element = find_mapping_elements_by_xref(trait_element, submission_element, trait_mapping_list_element)

    if mapping_element is None:
        mapping_element, preferred_name_element = find_mapping_elements_by_preferred_name(
            trait_element, submission_element, trait_mapping_list_element
        )

    if mapping_element is None:
        mapping_element, preferred_name_element = find_mapping_elements_by_name(
            trait_element, submission_element, trait_mapping_list_element
        )

    return (mapping_element, preferred_name_element)


def _associate_condition_with_medgen_id(submission_element, trait_mapping_list_element, trait_element):
    (mapping_element, preferred_name_element) = _determine_mapping_and_preferred_name_element(
        trait_element, submission_element, trait_mapping_list_element
    )

    if mapping_element is not None:
        medgen_element = mapping_element.find("./MedGen")
        return {"name": medgen_element.attrib["Name"], "medgen_id": medgen_element.attrib["CUI"]}

    elif preferred_name_element is not None:
        return {"name": preferred_name_element.text, "medgen_id": None}


def _parse_submission(submission_element, trait_mapping_list_element):
    submission = {}

    submission["id"] = submission_element.find("./ClinVarAccession").attrib["Accession"]
    submission["submitter_name"] = submission_element.find("./ClinVarAccession").attrib["SubmitterName"]

    classification_element = submission_element.find("./Classification")
    germline_classification_element = classification_element.find("./GermlineClassification")
    if germline_classification_element is not None:
        submission["clinical_significance"] = germline_classification_element.text

    submission["last_evaluated"] = classification_element.attrib.get("DateLastEvaluated", None)
    submission["review_status"] = classification_element.find("./ReviewStatus").text

    submission["conditions"] = []
    trait_elements = submission_element.findall("./TraitSet/Trait")
    for trait_element in trait_elements:
        condition_medgen_mapping = _associate_condition_with_medgen_id(
            submission_element, trait_mapping_list_element, trait_element
        )
        if condition_medgen_mapping is not None:
            submission["conditions"].append(condition_medgen_mapping)

    return submission


def _parse_variant(variant_element, tqdm_pbar=None):
    variant = {}

    if variant_element.find("./ClassifiedRecord") is None:
        return None

    variant["locations"] = {}
    location_elements = variant_element.findall("./ClassifiedRecord/SimpleAllele/Location/SequenceLocation")
    for element in location_elements:
        try:
            chromosome = element.attrib["Chr"]
            # A release in August 2022 introduced several Variants with a Chromosome of 'Un'
            #   which caused failure of this pipeline when compared to the reference genome
            if chromosome == "Un":
                variant["locations"] = {}
                allele_element = variant_element.findall("./ClassifiedRecord/SimpleAllele")
                if tqdm_pbar is not None:
                    tqdm_pbar.set_postfix_str(f'Skipped AlleleID: {allele_element[0].attrib["AlleleID"]} (Chr: Un)')
                break

            variant["locations"][element.attrib["Assembly"]] = {
                "locus": chromosome + ":" + element.attrib["positionVCF"],
                "alleles": [element.attrib["referenceAlleleVCF"], element.attrib["alternateAlleleVCF"]],
            }
        except KeyError:
            pass

    if not variant["locations"]:
        return None

    variant["clinvar_variation_id"] = variant_element.attrib["VariationID"]

    variant["rsid"] = None
    rsid_element = variant_element.find("./ClassifiedRecord/SimpleAllele/XRefList/XRef[@DB='dbSNP']")
    if rsid_element is not None:
        variant["rsid"] = rsid_element.attrib["ID"]

    germline_classification_element = variant_element.find("./ClassifiedRecord/Classifications/GermlineClassification")
    if germline_classification_element is None:
        return None
    variant["review_status"] = germline_classification_element.find("./ReviewStatus").text
    variant["gold_stars"] = CLINVAR_GOLD_STARS[variant["review_status"]]

    variant["clinical_significance"] = germline_classification_element.find("./Description").text

    variant["last_evaluated"] = germline_classification_element.attrib.get("DateLastEvaluated")

    submission_elements = variant_element.findall("./ClassifiedRecord/ClinicalAssertionList/ClinicalAssertion")
    trait_mapping_list_element = variant_element.find("./ClassifiedRecord/TraitMappingList")
    variant["submissions"] = [_parse_submission(el, trait_mapping_list_element) for el in submission_elements]

    return variant


def parse_clinvar_xml_to_tsv(
    input_xml_path,
    output_tsv_path,
    parse_variant_function,
):
    release_date = ""

    with open(output_tsv_path, "w", newline="") as output_file:
        writer = csv.writer(output_file, delimiter="\t", quotechar="", quoting=csv.QUOTE_NONE)
        writer.writerow(["locus_GRCh37", "alleles_GRCh37", "locus_GRCh38", "alleles_GRCh38", "variant"])

        open_function = gzip.open if str(input_xml_path).endswith(".gz") else open
        with open_function(input_xml_path, "r") as xml_file:
            # The exact number of variants in the XML file is unknown.
            # Approximate it to show a progress bar.
            progress = tqdm(total=3_100_000, mininterval=5)
            xml = ElementTree.iterparse(xml_file, events=["end"])
            for _, element in xml:
                if element.tag == "ClinVarVariationRelease":
                    release_date = element.attrib["ReleaseDate"]

                if element.tag == "VariationArchive":
                    try:
                        variant = parse_variant_function(element)
                        if variant is None:
                            element.clear()
                            continue
                        locations = variant.pop("locations")
                        writer.writerow(
                            [
                                locations["GRCh37"]["locus"] if "GRCh37" in locations else "NA",
                                json.dumps(locations["GRCh37"]["alleles"]) if "GRCh37" in locations else "NA",
                                (
                                    "chr" + locations["GRCh38"]["locus"].replace("MT", "M")
                                    if "GRCh38" in locations
                                    else "NA"
                                ),
                                json.dumps(locations["GRCh38"]["alleles"]) if "GRCh38" in locations else "NA",
                                json.dumps(variant),
                            ]
                        )
                        progress.update(1)

                    except Exception:
                        print(
                            f"Failed to parse variant {element.attrib['VariationID']}",
                            file=sys.stderr,
                        )
                        raise

                    # https://stackoverflow.com/questions/7697710/python-running-out-of-memory-parsing-xml-using-celementtree-iterparse
                    element.clear()

        progress.close()

    return release_date


def import_clinvar_xml(clinvar_xml_path):
    release_date = None

    clinvar_xml_local_path = os.path.join("/tmp", os.path.basename(clinvar_xml_path))
    print("Copying ClinVar XML")
    if not os.path.exists(clinvar_xml_local_path):
        subprocess.check_call(["gsutil", "cp", clinvar_xml_path, clinvar_xml_local_path])

    print("Parsing XML file")
    output_file = "/tmp/clinvar_variants.tsv"
    release_date = parse_clinvar_xml_to_tsv(
        input_xml_path=clinvar_xml_local_path, output_tsv_path=output_file, parse_variant_function=_parse_variant
    )

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


def _get_gnomad_variants(
    gnomad_exome_variants_path=None, gnomad_genome_variants_path=None, gnomad_mitochondrial_variants_path=None
):
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

    if gnomad_mitochondrial_variants_path:
        gnomad_mitochondrial_variants = hl.read_table(gnomad_mitochondrial_variants_path)
        gnomad_mitochondrial_variants = gnomad_mitochondrial_variants.select(
            genome=hl.struct(
                filters=gnomad_mitochondrial_variants.filters.map(
                    lambda f: MITOCHONDRIAL_VARIANT_FILTER_NAMES.get(f, f)
                ),
                # AC/AN fields in the MT variants table are int64 instead of int32.
                # They need to be converted to the same type as the nuclear variants' fields to union the tables.
                ac=hl.int(gnomad_mitochondrial_variants.AC_hom + gnomad_mitochondrial_variants.AC_het),
                an=hl.int(gnomad_mitochondrial_variants.AN),
            )
        )
        gnomad_mitochondrial_variants = gnomad_mitochondrial_variants.filter(
            gnomad_mitochondrial_variants.genome.ac > 0
        )
        gnomad_mitochondrial_variants = gnomad_mitochondrial_variants.annotate(
            exome=hl.missing(gnomad_mitochondrial_variants.genome.dtype)
        )

        gnomad_variants = gnomad_variants.union(gnomad_mitochondrial_variants)

    return gnomad_variants


def annotate_clinvar_variants_in_gnomad(
    clinvar_path,
    gnomad_exome_variants_path=None,
    gnomad_genome_variants_path=None,
    gnomad_mitochondrial_variants_path=None,
):
    gnomad_variants = _get_gnomad_variants(
        gnomad_exome_variants_path, gnomad_genome_variants_path, gnomad_mitochondrial_variants_path
    )
    ds = hl.read_table(clinvar_path)
    ds = ds.annotate(gnomad=gnomad_variants[ds.key])
    ds = ds.annotate(in_gnomad=hl.is_defined(ds.gnomad))
    return ds

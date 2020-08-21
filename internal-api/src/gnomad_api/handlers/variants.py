from aiohttp.web import Request, Response, HTTPNotFound

from ..exceptions import ValidationError
from ..parameters.parsing import parse_reference_genome, parse_region_id, parse_variant_id, parse_intervals
from ..queries.variant_datasets import gnomad_v3_variants, gnomad_v2_variants, exac_variants
from ..responses import json_response


VARIANT_MODULES = {
    "gnomad_r3": gnomad_v3_variants,
    "gnomad_r2_1": gnomad_v2_variants,
    "gnomad_r2_1_controls": gnomad_v2_variants,
    "gnomad_r2_1_non_neuro": gnomad_v2_variants,
    "gnomad_r2_1_non_cancer": gnomad_v2_variants,
    "gnomad_r2_1_non_topmed": gnomad_v2_variants,
    "exac": exac_variants,
}


DATASET_REFERENCE_GENOMES = {
    "gnomad_r3": "GRCh38",
    "gnomad_r2_1": "GRCh37",
    "gnomad_r2_1_controls": "GRCh37",
    "gnomad_r2_1_non_neuro": "GRCh37",
    "gnomad_r2_1_non_cancer": "GRCh37",
    "gnomad_r2_1_non_topmed": "GRCh37",
    "exac": "GRCh37",
}


DATASET_LABELS = {
    "gnomad_r3": "gnomAD v3",
    "gnomad_r2_1": "gnomAD v2",
    "gnomad_r2_1_controls": "gnomAD v2",
    "gnomad_r2_1_non_neuro": "gnomAD v2",
    "gnomad_r2_1_non_cancer": "gnomAD v2",
    "gnomad_r2_1_non_topmed": "gnomAD v2",
    "exac": "ExAC",
}


def variant_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    variant_id = parse_variant_id(request.match_info["variant_id"])
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} variants are not available on {reference_genome}")

    variant = VARIANT_MODULES[dataset].get_variant_by_id(variant_id, dataset)

    if not variant:
        raise HTTPNotFound(reason="Variant not found")

    return json_response({"data": variant})


def variants_in_gene_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    gene_id = request.match_info["gene_id"]
    intervals = parse_intervals(request.query.get("intervals"), reference_genome)
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} variants are not available on {reference_genome}")

    variants = VARIANT_MODULES[dataset].get_variants_by_gene(gene_id, dataset, intervals)

    return json_response({"data": variants})


def variants_in_region_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    region_id = parse_region_id(request.match_info["region_id"])
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} variants are not available on {reference_genome}")

    variants = VARIANT_MODULES[dataset].get_variants_by_region(region_id, dataset)

    return json_response({"data": variants})


def variants_in_transcript_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    transcript_id = request.match_info["transcript_id"]
    intervals = parse_intervals(request.query.get("intervals"), reference_genome)
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} variants are not available on {reference_genome}")

    variants = VARIANT_MODULES[dataset].get_variants_by_transcript(transcript_id, dataset, intervals)

    return json_response({"data": variants})

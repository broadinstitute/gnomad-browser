from aiohttp.web import Request, Response

from ..exceptions import ValidationError
from ..parameters.parsing import parse_reference_genome, parse_region_id
from ..queries.coverage import get_coverage_for_region, get_feature_coverage
from ..responses import json_response


DATASET_REFERENCE_GENOMES = {
    "gnomad_r3": "GRCh38",
    "gnomad_r2_1": "GRCh37",
    "exac": "GRCh37",
}


DATASET_LABELS = {
    "gnomad_r3": "gnomAD v3",
    "gnomad_r2_1": "gnomAD v2",
    "exac": "ExAC",
}


def exome_coverage_in_region_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    region_id = parse_region_id(request.match_info["region_id"])
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} coverage is not available on {reference_genome}")

    try:
        table = request.app["exome_coverage"][dataset]
    except KeyError:
        coverage = []
    else:
        coverage = get_coverage_for_region(table, region_id, reference_genome)

    return json_response({"data": coverage})


def genome_coverage_in_region_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    region_id = parse_region_id(request.match_info["region_id"])
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} coverage is not available on {reference_genome}")

    try:
        table = request.app["genome_coverage"][dataset]
    except KeyError:
        coverage = []
    else:
        coverage = get_coverage_for_region(table, region_id, reference_genome)

    return json_response({"data": coverage})


def coverage_in_gene_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    gene_id = request.match_info["gene_id"]
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} coverage is not available on {reference_genome}")

    try:
        table = request.app["gene_feature_coverage"][dataset]
    except KeyError:
        coverage = {"exome": [], "genome": []}
    else:
        coverage = get_feature_coverage(table, gene_id)

    return json_response({"data": coverage})


def coverage_in_transcript_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    transcript_id = request.match_info["transcript_id"]
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(f"{DATASET_LABELS[dataset]} coverage is not available on {reference_genome}")

    try:
        table = request.app["transcript_feature_coverage"][dataset]
    except KeyError:
        coverage = {"exome": [], "genome": []}
    else:
        coverage = get_feature_coverage(table, transcript_id)

    return json_response({"data": coverage})

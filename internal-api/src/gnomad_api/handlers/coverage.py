from aiohttp.web import Request, Response

from ..exceptions import ValidationError
from ..parameters.parsing import parse_reference_genome, parse_region_id
from ..queries.coverage import get_coverage_for_region, get_feature_coverage
from ..responses import json_response
from ..sources import (
    GNOMAD_V3_GENOME_COVERAGE,
    GNOMAD_V3_GENE_FEATURE_COVERAGE,
    GNOMAD_V3_TRANSCRIPT_FEATURE_COVERAGE,
    GNOMAD_V2_EXOME_COVERAGE,
    GNOMAD_V2_GENOME_COVERAGE,
    GNOMAD_V2_GENE_FEATURE_COVERAGE,
    GNOMAD_V2_TRANSCRIPT_FEATURE_COVERAGE,
    EXAC_EXOME_COVERAGE,
    EXAC_GENE_FEATURE_COVERAGE,
    EXAC_TRANSCRIPT_FEATURE_COVERAGE,
)


EXOME_COVERAGE_TABLES = {
    "gnomad_r2_1": GNOMAD_V2_EXOME_COVERAGE,
    "exac": EXAC_EXOME_COVERAGE,
}

GENOME_COVERAGE_TABLES = {
    "gnomad_r2_1": GNOMAD_V2_GENOME_COVERAGE,
    "gnomad_r3": GNOMAD_V3_GENOME_COVERAGE,
}

GENE_FEATURE_COVERAGE_TABLES = {
    "gnomad_r3": GNOMAD_V3_GENE_FEATURE_COVERAGE,
    "gnomad_r2_1": GNOMAD_V2_GENE_FEATURE_COVERAGE,
    "exac": EXAC_GENE_FEATURE_COVERAGE,
}

TRANSCRIPT_FEATURE_COVERAGE_TABLES = {
    "gnomad_r3": GNOMAD_V3_TRANSCRIPT_FEATURE_COVERAGE,
    "gnomad_r2_1": GNOMAD_V2_TRANSCRIPT_FEATURE_COVERAGE,
    "exac": EXAC_TRANSCRIPT_FEATURE_COVERAGE,
}


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
        table = EXOME_COVERAGE_TABLES[dataset]
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
        table = GENOME_COVERAGE_TABLES[dataset]
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
        table = GENE_FEATURE_COVERAGE_TABLES[dataset]
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
        table = TRANSCRIPT_FEATURE_COVERAGE_TABLES[dataset]
    except KeyError:
        coverage = {"exome": [], "genome": []}
    else:
        coverage = get_feature_coverage(table, transcript_id)

    return json_response({"data": coverage})

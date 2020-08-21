from aiohttp.web import Request, Response, HTTPNotFound

from ..parameters.parsing import parse_reference_genome, parse_region_id, parse_variant_id, parse_intervals
from ..queries.variant_datasets.clinvar_variants import (
    get_clinvar_variant_by_id,
    get_clinvar_variants_by_gene,
    get_clinvar_variants_by_region,
    get_clinvar_variants_by_transcript,
)
from ..responses import json_response
from ..sources import CLINVAR_GRCH37_VARIANTS, CLINVAR_GRCH38_VARIANTS


CLINVAR_VARIANT_TABLES = {
    "GRCh37": CLINVAR_GRCH37_VARIANTS,
    "GRCh38": CLINVAR_GRCH38_VARIANTS,
}


def clinvar_variant_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    variant_id = parse_variant_id(request.match_info["variant_id"])

    table = CLINVAR_VARIANT_TABLES[reference_genome]
    variant = get_clinvar_variant_by_id(table, variant_id, reference_genome)

    if not variant:
        raise HTTPNotFound(reason="Variant not found")

    return json_response({"data": variant})


def clinvar_variants_in_gene_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    gene_id = request.match_info["gene_id"]
    intervals = parse_intervals(request.query.get("intervals"), reference_genome)

    table = CLINVAR_VARIANT_TABLES[reference_genome]
    variants = get_clinvar_variants_by_gene(table, gene_id, intervals)

    return json_response({"data": variants})


def clinvar_variants_in_region_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    region_id = parse_region_id(request.match_info["region_id"])

    table = CLINVAR_VARIANT_TABLES[reference_genome]
    variants = get_clinvar_variants_by_region(table, region_id, reference_genome)

    return json_response({"data": variants})


def clinvar_variants_in_transcript_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    transcript_id = request.match_info["transcript_id"]
    intervals = parse_intervals(request.query.get("intervals"), reference_genome)

    table = CLINVAR_VARIANT_TABLES[reference_genome]
    variants = get_clinvar_variants_by_transcript(table, transcript_id, intervals)

    return json_response({"data": variants})

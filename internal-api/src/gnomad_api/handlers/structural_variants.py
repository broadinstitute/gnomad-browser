from aiohttp.web import Request, Response, HTTPNotFound

from ..exceptions import ValidationError
from ..parameters.parsing import parse_reference_genome, parse_region_id
from ..queries.variant_datasets.structural_variants import (
    get_structural_variant_by_id,
    get_structural_variants_by_gene,
    get_structural_variants_by_region,
)
from ..responses import json_response


def structural_variant_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    variant_id = request.match_info["variant_id"]
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != "GRCh37":
        raise ValidationError(f"gnomAD v2 structural variants are not available on {reference_genome}")

    variant = get_structural_variant_by_id(variant_id, dataset)

    if not variant:
        raise HTTPNotFound(reason="Variant not found")

    return json_response({"data": variant})


def structural_variants_in_gene_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    gene_symbol = request.match_info["gene_symbol"]
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != "GRCh37":
        raise ValidationError(f"gnomAD v2 structural variants are not available on {reference_genome}")

    variants = get_structural_variants_by_gene(gene_symbol, dataset)

    return json_response({"data": variants})


def structural_variants_in_region_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    region_id = parse_region_id(request.match_info["region_id"])
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != "GRCh37":
        raise ValidationError(f"gnomAD v2 structural variants are not available on {reference_genome}")

    variants = get_structural_variants_by_region(region_id, dataset)

    return json_response({"data": variants})

from aiohttp.web import Request, Response, HTTPNotFound

from ..exceptions import ValidationError
from ..parameters.parsing import parse_reference_genome, parse_variant_id
from ..queries.variant_datasets import gnomad_v2_mnvs
from ..responses import json_response


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


def multi_nucleotide_variant_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    variant_id = parse_variant_id(request.match_info["variant_id"])
    dataset = request.query.get("dataset")

    if not dataset:
        raise ValidationError("Dataset is required")

    if reference_genome != DATASET_REFERENCE_GENOMES[dataset]:
        raise ValidationError(
            f"{DATASET_LABELS[dataset]} multi-nucleotide variants are not available on {reference_genome}"
        )

    if dataset != "gnomad_r2_1":
        raise ValidationError(f"Multi-nucleotide variants are not available in {DATASET_LABELS[dataset]}")

    variant = gnomad_v2_mnvs.get_multi_nucleotide_variant_by_id(variant_id)

    if not variant:
        raise HTTPNotFound(reason="Variant not found")

    return json_response({"data": variant})

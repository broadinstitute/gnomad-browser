from aiohttp import web

from .handlers.clinvar_variants import (
    clinvar_variant_handler,
    clinvar_variants_in_gene_handler,
    clinvar_variants_in_region_handler,
    clinvar_variants_in_transcript_handler,
)
from .handlers.coverage import (
    coverage_in_gene_handler,
    coverage_in_transcript_handler,
    exome_coverage_in_region_handler,
    genome_coverage_in_region_handler,
)
from .handlers.gene import gene_handler, gene_search_terms_handler
from .handlers.region import genes_in_region_handler
from .handlers.multi_nucleotide_variants import multi_nucleotide_variant_handler
from .handlers.rsids import rsid_handler
from .handlers.structural_variants import (
    structural_variant_handler,
    structural_variants_in_gene_handler,
    structural_variants_in_region_handler,
)
from .handlers.transcript import transcript_handler
from .handlers.variants import (
    variant_handler,
    variants_in_gene_handler,
    variants_in_region_handler,
    variants_in_transcript_handler,
)


def readiness_check_handler(request: web.Request) -> web.Response:  # pylint: disable=unused-argument
    return web.Response(text="ok")


routes = [
    ("/health/ready", readiness_check_handler),
    # Gene endpoints
    ("/{reference_genome}/gene/{gene_id}/", gene_handler),
    ("/{reference_genome}/gene/{gene_id}/coverage/", coverage_in_gene_handler),
    ("/{reference_genome}/gene/{gene_id}/clinvar_variants/", clinvar_variants_in_gene_handler),
    ("/{reference_genome}/gene/{gene_id}/variants/", variants_in_gene_handler),
    ("/{reference_genome}/gene/{gene_symbol}/structural_variants/", structural_variants_in_gene_handler),
    # Region endpoints
    ("/{reference_genome}/region/{region_id}/genes/", genes_in_region_handler),
    ("/{reference_genome}/region/{region_id}/coverage/exome/", exome_coverage_in_region_handler),
    ("/{reference_genome}/region/{region_id}/coverage/genome/", genome_coverage_in_region_handler),
    ("/{reference_genome}/region/{region_id}/clinvar_variants/", clinvar_variants_in_region_handler),
    ("/{reference_genome}/region/{region_id}/variants/", variants_in_region_handler),
    ("/{reference_genome}/region/{region_id}/structural_variants/", structural_variants_in_region_handler),
    # Transcript endpoints
    ("/{reference_genome}/transcript/{transcript_id}/", transcript_handler),
    ("/{reference_genome}/transcript/{transcript_id}/coverage/", coverage_in_transcript_handler),
    ("/{reference_genome}/transcript/{transcript_id}/clinvar_variants/", clinvar_variants_in_transcript_handler),
    ("/{reference_genome}/transcript/{transcript_id}/variants/", variants_in_transcript_handler),
    # Variant endpoints
    ("/{reference_genome}/clinvar_variant/{variant_id}/", clinvar_variant_handler),
    ("/{reference_genome}/multi_nucleotide_variant/{variant_id}/", multi_nucleotide_variant_handler),
    ("/{reference_genome}/structural_variant/{variant_id}/", structural_variant_handler),
    ("/{reference_genome}/variant/{variant_id}/", variant_handler),
    # rsID search
    ("/rsid/{rsid}/", rsid_handler),
    # Gene search
    ("/gene_search_terms/", gene_search_terms_handler),
]

routes = [web.get(path, handler) for (path, handler) in routes]

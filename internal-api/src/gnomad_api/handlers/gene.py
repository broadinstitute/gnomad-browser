from aiohttp.web import Request, Response, HTTPNotFound

from ..parameters.parsing import parse_reference_genome
from ..queries.gene import get_gene_by_id, get_all_gene_search_terms
from ..responses import json_response


def gene_handler(request: Request) -> Response:
    gene_tables = request.app["gene_tables"]
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    gene_id = request.match_info["gene_id"]

    gene = get_gene_by_id(gene_tables[reference_genome], gene_id, reference_genome)

    if not gene:
        raise HTTPNotFound(reason="Gene not found")

    return json_response({"data": gene})


def gene_search_terms_handler(request: Request) -> Response:  # pylint: disable=unused-argument
    search_terms = get_all_gene_search_terms()
    return json_response({"data": search_terms})

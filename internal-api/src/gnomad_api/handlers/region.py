from aiohttp.web import Request, Response

from ..parameters.parsing import parse_reference_genome, parse_region_id
from ..queries.gene import get_genes_in_region
from ..responses import json_response


def genes_in_region_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    region_id = parse_region_id(request.match_info["region_id"])

    genes = get_genes_in_region(request.app["genes_tables"][reference_genome], region_id, reference_genome)

    return json_response({"data": genes})

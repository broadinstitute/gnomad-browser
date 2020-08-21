from aiohttp.web import Request, Response

from ..queries.rsids import get_variants_by_rsid
from ..responses import json_response


def rsid_handler(request: Request) -> Response:
    rsid = request.match_info["rsid"]

    variants = get_variants_by_rsid(rsid)

    return json_response({"data": variants})

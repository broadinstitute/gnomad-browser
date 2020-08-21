from aiohttp.web import Request, Response, HTTPNotFound

from ..parameters.parsing import parse_reference_genome
from ..queries.transcript import get_transcript_by_id
from ..responses import json_response


def transcript_handler(request: Request) -> Response:
    reference_genome = parse_reference_genome(request.match_info["reference_genome"])
    transcript_id = request.match_info["transcript_id"]

    transcript = get_transcript_by_id(transcript_id, reference_genome)

    if not transcript:
        raise HTTPNotFound(reason="Transcript not found")

    return json_response({"data": transcript})

import json
from functools import partial

import hail as hl
from aiohttp.web import json_response


class HailJSONEncoder(json.JSONEncoder):
    def default(self, o):  # pylint: disable=method-hidden
        if isinstance(o, hl.Struct):
            return dict(o)

        if isinstance(o, hl.Locus):
            return {"contig": o.contig, "position": o.position}

        if isinstance(o, hl.Interval):
            return {"start": o.start, "end": o.end}

        if isinstance(o, set):
            return list(o)

        return super().default(o)


json_response = partial(json_response, dumps=partial(json.dumps, cls=HailJSONEncoder))

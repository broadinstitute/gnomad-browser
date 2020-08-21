import logging

from aiohttp.web import HTTPException, Request, Response, json_response, middleware


logger = logging.getLogger(__name__)


class ValidationError(Exception):
    pass


@middleware
async def exception_handler_middleware(request: Request, handler) -> Response:
    try:
        response = await handler(request)
        return response
    except ValidationError as exc:
        return json_response({"error": {"message": str(exc)}}, status=400)
    except HTTPException as exc:
        return json_response({"error": {"message": exc.reason}}, status=exc.status)
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception(exc)
        return json_response({"error": {"message": "Internal error"}}, status=500)

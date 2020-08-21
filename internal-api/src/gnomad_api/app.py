import hail as hl
from aiohttp import web

from . import settings
from .exceptions import exception_handler_middleware
from .routes import routes


async def init_app(*args) -> web.Application:  # pylint: disable=unused-argument
    hl.init(
        local=f"local[{settings.HAIL_N_CPUS}]",
        log=settings.HAIL_LOG_PATH,
        quiet=not settings.DEBUG,
        spark_conf=settings.HAIL_SPARK_CONF,
    )

    app = web.Application(debug=settings.DEBUG, middlewares=[exception_handler_middleware])
    app.add_routes(routes)

    return app

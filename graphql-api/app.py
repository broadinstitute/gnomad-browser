from ariadne import (
    ObjectType,
    graphql_sync,
    make_executable_schema,
    load_schema_from_path,
    convert_kwargs_to_snake_case,
    snake_case_fallback_resolvers,
    gql,
)
from ariadne.explorer import ExplorerGraphiQL
from flask import Flask, jsonify, request
import polars as pl
import datetime

# ICEBERG_METADATA_FILENAME = "00078-42f16389-a670-47a4-b2ee-b13ac02a3f0d.metadata.json"

type_defs = gql(load_schema_from_path("schema.graphql"))
query = ObjectType("Query")
db = pl.scan_iceberg(
    f"gs://gnomad-browser-data-pipeline/phil-scratch/output/iceberg_warehouse/default.db/long_reads/metadata/00078-654352f6-814c-49cc-8c40-41d6c9365f7a.metadata.json"
)


@convert_kwargs_to_snake_case
@query.field("region")
def region_resolver(obj, info, chrom, start_pos, end_pos):
    db_variants = db.filter(pl.col("pos").is_between(int(start_pos), int(end_pos)))
    variants = db_variants.collect().to_dicts()
    return {"success": True, "variants": variants}


schema = make_executable_schema(type_defs, query, snake_case_fallback_resolvers)
# query.set_field("region", region_resolver)

app = Flask(__name__)

# Retrieve HTML for the GraphiQL.
# If explorer implements logic dependant on current request,
# change the html(None) call to the html(request)
# and move this line to the graphql_explorer function.
explorer_html = ExplorerGraphiQL().html(None)


@app.route("/graphql", methods=["GET"])
def graphql_explorer():
    # On GET request serve the GraphQL explorer.
    # You don't have to provide the explorer if you don't want to
    # but keep on mind this will not prohibit clients from
    # exploring your API using desktop GraphQL explorer app.
    return explorer_html, 200


@app.route("/graphql", methods=["POST"])
def graphql_server():
    # GraphQL queries are always sent as POST
    data = request.get_json()

    # Note: Passing the request to the context is optional.
    # In Flask, the current request is always accessible as flask.request
    success, result = graphql_sync(schema, data, context_value={"request": request}, debug=app.debug)

    status_code = 200 if success else 400
    return jsonify(result), status_code


if __name__ == "__main__":
    app.run(debug=True)

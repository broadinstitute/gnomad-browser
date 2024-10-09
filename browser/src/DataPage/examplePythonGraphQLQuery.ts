const content = `# This example uses the GQL GraphQL client library.
#
# To install: pip3 install gql
#
# GQL is one popular Python GraphQL client, but there are others.
# See https://graphql.org/community/tools-and-libraries/?tags=python_client

from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport

transport = AIOHTTPTransport(url="https://gnomad.broadinstitute.org/api")
client = Client(transport=transport, fetch_schema_from_transport=True)

# For brevity, and to keep the focus on the Python code, we don't include every
# field from the raw query here.

query = gql(
    """
    query VariantsInGene {
      gene(gene_symbol: "BRCA1", reference_genome: GRCh38) {
        variants(dataset: gnomad_r4) {
          variant_id
          pos
          exome {
            ac
            ac_hemi
            ac_hom
            an
            af
          }
        }
      }
    }
"""
)

# Execute the query on the transport
result = await client.execute_async(query)
print(result)`

export default content

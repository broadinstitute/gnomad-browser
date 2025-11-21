from typing import List
from google.cloud import logging_v2
from pprint import pp
from datetime import datetime, timezone, timedelta
from time import sleep
from sys import stderr
from json import JSONEncoder

client = logging_v2.client.Client(project="exac-gnomad")

time_format = "%Y-%m-%dT%H:%M:%S.%fZ"
start_time = datetime.fromisoformat("2025-11-18Z00:00").replace(tzinfo=timezone.utc)
end_time = datetime.fromisoformat("2025-11-19Z00:00")

filter_string = (
    f'httpRequest.requestMethod="POST" '
    f'resource.labels.container_name="app" '
    f'timestamp>="{start_time.strftime(time_format)}" '
    f'timestamp<="{end_time.strftime(time_format)}" '
)

entries = client.list_entries(
    resource_names=[f"projects/exac-gnomad"],
    order_by="timestamp asc",
    #    max_results=1,
    filter_=filter_string,
)

n = 0
full_n = 0
result = []

encoder = JSONEncoder()

print("const queries = [")

for entry in entries:
    n = n + 1
    full_n = full_n + 1

    if "graphqlRequest" in entry.payload:
        delta = (entry.timestamp - start_time) / timedelta(milliseconds=1)
        graphql = entry.payload["graphqlRequest"]
        formatted_entry = {
            "time_offset": delta,
            "query": graphql["graphqlQueryString"],
            "variables": graphql["graphqlQueryVariables"],
        }
        print(encoder.encode(formatted_entry))
        print(",")
    else:
        print("Weird payload", file=stderr)
        pp(entry.payload, stderr)

    pp((full_n, n), stderr)
    if n >= 500:
        n = 0
        sleep(15)
print("]")
print("export default queries")

#!/usr/bin/env python3
"""POST-LOAD ONLY: bounded system metadata, never methylation/genotype data scans.
Requires an explicitly verified candidate endpoint and read-only credential.
Writes one new local evidence file, never DB data. Not a runtime preflight substitute.
"""
import datetime
import json
import os
import sys
import urllib.parse
import urllib.request

DB = 'gnomad_lr_y1_methylation_source_haplotype_full_genome_20260803_v3'
TABLE = 'lr_y1_methylation_source_haplotype_presentation'
RUN = 'y1-hgsvc-hprc-methylation-source-haplotype-full-genome-20260803-v3-source-labelled-v1'
RECEIPT = 'be522cfe12455af49127ba8cf84ccb102af0c408112d6ec7b650892815aec218'

if len(sys.argv) != 2:
    raise SystemExit('Usage: CH_ENDPOINT=http://verified-candidate:8123 collect-physical.py NEW-OUTPUT.json')
endpoint = os.environ['CH_ENDPOINT'].rstrip('/')
headers = {}
if os.environ.get('CH_USER'):
    headers['X-ClickHouse-User'] = os.environ['CH_USER']
if os.environ.get('CH_PASSWORD'):
    headers['X-ClickHouse-Key'] = os.environ['CH_PASSWORD']
queries = {
    'tables': f"SELECT name,engine,partition_key,sorting_key,create_table_query FROM system.tables WHERE database='{DB}' AND name='{TABLE}'",
    'columns': f"SELECT name,type,position FROM system.columns WHERE database='{DB}' AND table='{TABLE}' ORDER BY position",
    'parts': f"SELECT partition AS chrom,sum(rows) AS rows FROM system.parts WHERE active AND database='{DB}' AND table='{TABLE}' GROUP BY partition ORDER BY partition",
}
result = {'database': DB, 'run_id': RUN, 'serving_receipt_sha256': RECEIPT,
          'observed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'endpoint': endpoint, 'queries': queries}
# Exclusive destination: never replace an earlier observation or failed attempt.
with open(sys.argv[1], 'x') as out:
    for key, sql in queries.items():
        query = urllib.parse.urlencode({'query': sql + ' FORMAT JSONEachRow', 'readonly': 2,
                                        'max_threads': 1, 'max_execution_time': 10,
                                        'max_rows_to_read': 100000, 'max_result_rows': 1000})
        with urllib.request.urlopen(urllib.request.Request(endpoint + '/?' + query, headers=headers), timeout=15) as response:
            result[key] = [json.loads(line) for line in response.read().decode().splitlines() if line]
    json.dump(result, out, indent=2)
    out.write('\n')

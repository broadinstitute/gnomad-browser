#!/usr/bin/env python3
"""Seed local Elasticsearch with test haplotype and methylation data."""
import json
import urllib.request

ES = "http://localhost:9200"

# Haplotype data - 6 samples, each with variants on strand 1 and 2
samples = ["HG002", "HG003", "HG004", "HG005", "HG006", "HG007"]
variants = [
    {"pos": 100038008, "ref": "A", "alt": "G", "af": 0.85, "rsid": "rs12345", "svtype": None, "svlen": 0},
    {"pos": 100042500, "ref": "C", "alt": "T", "af": 0.42, "rsid": "rs23456", "svtype": None, "svlen": 0},
    {"pos": 100055000, "ref": "G", "alt": "A", "af": 0.15, "rsid": "rs34567", "svtype": None, "svlen": 0},
    {"pos": 100062000, "ref": "T", "alt": "C", "af": 0.72, "rsid": "rs45678", "svtype": None, "svlen": 0},
    {"pos": 100075000, "ref": "A", "alt": "ATCGATCG", "af": 0.03, "rsid": "rs56789", "svtype": "INS", "svlen": 4},
    {"pos": 100088000, "ref": "ATCG", "alt": "A", "af": 0.55, "rsid": "rs67890", "svtype": "DEL", "svlen": 3},
]

bulk_lines = []
count = 0
for sample in samples:
    for strand in [1, 2]:
        idxs = [0, 1, 2, 3] if strand == 1 else [2, 3, 4, 5]
        for vi in idxs:
            v = variants[vi]
            doc_id = f"{sample}_{strand}_chr1_{v['pos']}_{v['ref']}_{v['alt']}"
            doc = {
                "document_id": doc_id,
                "sample_id": sample,
                "strand": strand,
                "chrom": "chr1",
                "position": v["pos"],
                "alleles": [v["ref"], v["alt"]],
                "rsid": v["rsid"],
                "qual": 30.0,
                "filters": ["PASS"],
                "info_AF": [v["af"]],
                "info_AC": 10,
                "info_AN": 94,
                "gt_alleles": [0, 1],
                "gt_phased": True,
            }
            if v["svtype"]:
                doc["info_SVTYPE"] = v["svtype"]
                doc["info_SVLEN"] = v["svlen"]
            bulk_lines.append(json.dumps({"index": {"_index": "gnomad_r4_lr_haplotypes", "_type": "_doc", "_id": doc_id}}))
            bulk_lines.append(json.dumps(doc))
            count += 1

body = "\n".join(bulk_lines) + "\n"
req = urllib.request.Request(f"{ES}/_bulk", data=body.encode(), headers={"Content-Type": "application/x-ndjson"})
resp = json.loads(urllib.request.urlopen(req).read())
print(f"Haplotypes: inserted {count} docs, errors={resp['errors']}")

# Methylation data
meth_samples = ["sample_1_high", "sample_2_normal", "sample_3_high", "sample_4_normal"]
bulk_lines = []
mcount = 0
for ms in meth_samples:
    for pos in range(100000000, 100100001, 5000):
        mval = 50.0 + (pos % 50) if "high" in ms else 10.0 + (pos % 30)
        doc_id = f"{ms}_chr1_{pos}"
        doc = {
            "document_id": doc_id,
            "sample_id": ms,
            "chrom": "chr1",
            "pos1": pos,
            "pos2": pos + 1,
            "methylation": round(mval, 2),
        }
        bulk_lines.append(json.dumps({"index": {"_index": "gnomad_r4_lr_methylation", "_type": "_doc", "_id": doc_id}}))
        bulk_lines.append(json.dumps(doc))
        mcount += 1

body = "\n".join(bulk_lines) + "\n"
req = urllib.request.Request(f"{ES}/_bulk", data=body.encode(), headers={"Content-Type": "application/x-ndjson"})
resp = json.loads(urllib.request.urlopen(req).read())
print(f"Methylation: inserted {mcount} docs, errors={resp['errors']}")

# Verify
for idx in ["gnomad_r4_lr_haplotypes", "gnomad_r4_lr_methylation"]:
    resp = json.loads(urllib.request.urlopen(f"{ES}/{idx}/_count").read())
    print(f"{idx}: {resp['count']} docs")

print("\nDone! Test region: chr1:100000000-100100000")

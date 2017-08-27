#!/usr/bin/env python

import argparse as ap
import hail
from pprint import pprint

from utils.computed_fields_utils import get_expr_for_orig_alt_alleles_set

p = ap.ArgumentParser()
p.add_argument("vcf_path")
p.add_argument("-o", "--output-path" required=True)
args = p.parse_args()

print(args.vcf_path)

hc = hail.HailContext(log="/hail.log")

output_path = args.output_path

print("\n==> import_vcf: %s" % args.vcf_path)
vds = hc.import_vcf(args.vcf_path, force_bgz=True, min_partitions=10000)

print("\n==> split_multi")
vds = vds.annotate_variants_expr("va.originalAltAlleles=%s" % get_expr_for_orig_alt_alleles_set())
vds = vds.split_multi()
print("")
pprint(vds.variant_schema)
print("\n==> output: %s" % output_path)
vds.write(output_path, overwrite=True)

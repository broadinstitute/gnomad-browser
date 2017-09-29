#!/usr/bin/env python

import hail
from hail.expr import TStruct
from pprint import pprint

def flatten_struct(struct, root='', leaf_only=True):
    result = {}
    for f in struct.fields:
        path = '%s.%s' % (root, f.name)
        if isinstance(f.typ, TStruct):
            result.update(flatten_struct(f.typ, path))
            if not leaf_only:
                result[path] = f
        else:
            result[path] = f
    return result

hc = hail.HailContext(log="/hail.log")
genomes_vds = hc.read('gs://gnomad-public/release/2.0.2/vds/genomes/gnomad.genomes.r2.0.2.sites.vds')

as_filter_status_fields=['va.info.AS_FilterStatus']
as_filter_status_attributes = flatten_struct(genomes_vds.variant_schema, root="va")
as_filter_status_expression = ['%s = %s.map(x => orMissing(isDefined(x), if(x.isEmpty()) "PASS" else x.toArray.mkString("|")))' % (x, x) for x in as_filter_status_fields]

genomes_vds = genomes_vds.annotate_variants_expr(as_filter_status_expression)
pprint(genomes_vds.variant_schema)
genomes_vds.export_vcf('gs://gnomad-browser/genomes/sept-2017-release-202-parts/gnomad.genomes.r2.0.2.sites.parts.vcf.bgz', parallel=True)

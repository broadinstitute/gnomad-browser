#!/usr/bin/env python

"""Hail/pandas tools."""

import hail
from hail.representation import Interval

def make_df(hc, intervals, vds, split_multi=False):
    intervals_parsed = map(Interval.parse, intervals)
    variants_in_interval = vds.filter_intervals(intervals_parsed)
    print 'Before splitting %s' % variants_in_interval.count_variants()
    if split_multi is True:
        variants_in_interval = variants_in_interval.split_multi()
        print 'After splitting: %s' % variants_in_interval.count_variants()

    kt = variants_in_interval.make_table([
        'pos = v.start',
        'variant_id = v.contig + "-" + v.start + "-" + v.altAlleles[0]',
        'rsid = va.rsid',
        'pass = va.pass',
        'filters = va.filters',
        'as_filter_status = va.info.AS_FilterStatus[0oading
        'consequence = va.vep.most_severe_consequence',
        'lof = va.vep.transcript_consequences[0].lof',
        'allele_count = va.info.AC[0]',
        'allele_num = va.info.AN',
        'allele_freq = va.info.AF[0]',
        'hom_count = va.info.Hom[0]',
        # 'amino_acids = va.vep.transcript_consequences[0].amino_acids',
        'hgvsp = va.vep.transcript_consequences[0].ongo',
        'hgvsc = va.vep.transcript_consequences[0].hgvsc'
    ], [], [])

    df = kt.to_dataframe()
    pd = df.toPandas()
    # pd = pd.set_index(['variant_id'])
    print pd.columns
    return pd

def make_variant_table(hc, interval_string, vds, split_multi=False):
    variants_in_interval = vds.filter_intervals(Interval.parse(interval_string))
    print 'Before splitting %s' % variants_in_interval.count_variants()
    if split_multi is True:
        variants_in_interval = variants_in_interval.split_multi()
        print 'After splitting: %s' % variants_in_interval.count_variants()

    kt = variants_in_interval.variants_table()

    df = kt.to_pandas()
    print df.columns
    return df

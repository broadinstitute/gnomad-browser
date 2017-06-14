#!/usr/bin/env python

"""Schizophrenia data."""

import hail
from hail.representation import Interval

def make_schz_df(vds, split_multi=False):
    print 'Before splitting %s' % vds.count_variants()
    if split_multi is True:
        vds = vds.split_multi()
        print 'After splitting: %s' % vds.count_variants()

    kt = vds.variant_table()

    df = kt.to_dataframe()
    pd = df.toPandas()
    # pd = pd.set_index(['variant_id'])
    print pd.columns
    return pd

def main():
    hc = hail.HailContext()
    vds = hc.import_vcf('/Users/msolomon/Data/schizophrenia/daner_combined_refmt.vcf.bgz', force=True)
    df = make_schz_df(vds)
    print df

if __name__ == '__main__':
    main()

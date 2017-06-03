#!/usr/bin/env python

"""Subset VDS files."""

from hail import HailContext
from hail.representation import Interval
import lens
from lens.hail.pandas import make_df
from lens.graphql import get_gene_intervals
from lens.constants import GNOMAD_VDS_PATH

def main():
    """Filter vds for exon variants in a gene"""
    hail_context = HailContext()
    intervals = get_gene_intervals('BRCA2')
    vds = hail_context.read(GNOMAD_VDS_PATH)
    intervals_parsed = map(Interval.parse, intervals)
    variants_in_interval = vds.filter_intervals(intervals_parsed)
    variants_in_interval.write('sample.vds')
    hail_context.stop()

if __name__ == '__main__':
    # print 'hello'
    main()

#!/usr/bin/env python

"""Tests for hail utils."""

from __future__ import print_function
import lens
from lens import TEST_AWESOME
from lens import hailutils
# from lens.hail_utilies import get_hail_context

VDS_PATH = '/Users/msolomon/data/gnomad/170520_gnomad_data/exomes/gnomad.exomes.r2.0.1.sites.vds'
# HAIL_CONTEXT = lens.get_hail_context()


print(lens.TEST_AWESOME)

assert lens.TEST_AWESOME == 'yissss'
# assert VDS == 'hello'
# assert lens.get_hail_context(VDS_PATH) == 'yissss'
# print(VDS.variant_schema())



# hail_context.stop()

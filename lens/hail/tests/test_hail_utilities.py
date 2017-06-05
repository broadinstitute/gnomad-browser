# # #!/usr/bin/env python
# #
# """Test hail/pandas functions."""
#
# from pandas import DataFrame
# from hail import HailContext
# from hail.expr import TStruct
# from lens.constants import TEST_VDS_PATH
# from lens.hail.pandas import make_df
#
# def test_make_df():
#     """docstring."""
#     HAIL_CONTEXT = HailContext()
#     VDS = HAIL_CONTEXT.read(TEST_VDS_PATH)
#     df = make_df(VDS)
#     assert isinstance(df, DataFrame)
#     assert len(df) == 2519
#
#     columns = df.columns
#     assert list(columns) == [u'pos', u'variant_id', u'rsid', u'pass', u'filters',
#        u'as_filter_status', u'consequence', u'lof', u'allele_count',
#        u'allele_num', u'allele_freq', u'hom_count', u'hgvsp', u'hgvsc']
#
#     HAIL_CONTEXT.stop()

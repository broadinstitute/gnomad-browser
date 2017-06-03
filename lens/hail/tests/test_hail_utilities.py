# #!/usr/bin/env python
#
# """Tests for hail utils."""
#
# from hail import HailContext
# from lens.hail.pandas import make_df
# from lens.graphql import get_gene_intervals
# from lens.constants import GNOMAD_VDS_PATH
#
# HAIL_CONTEXT = HailContext()
# INTERVALS = get_gene_intervals('BRCA2')
# VDS = HAIL_CONTEXT.read(GNOMAD_VDS_PATH)
#
# make_df(HAIL_CONTEXT, INTERVALS, VDS)
#
#
# print(lens.TEST_AWESOME)
#
# assert lens.TEST_AWESOME == 'yissss'
# # assert VDS == 'hello'
# # assert lens.get_hail_context(VDS_PATH) == 'yissss'
# # print(VDS.variant_schema())
#
#
#
# # hail_context.stop()

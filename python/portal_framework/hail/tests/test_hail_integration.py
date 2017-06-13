# #!/usr/bin/env python
#
"""Test hail api!"""
#
from hail import HailContext
from hail.expr import TStruct
from portal_framework.constants import TEST_VDS_PATH

def test_variant_dataset():
    """docstring."""
    HAIL_CONTEXT = HailContext()
    VDS = HAIL_CONTEXT.read(TEST_VDS_PATH)
    assert isinstance(VDS.variant_schema, TStruct)
    # assert VDS.variant_schema.__str__().split(',')[0] == 'Struct{rsid:String'
    assert VDS.variant_schema.__str__().split('\n')[0] == 'Struct {'
    samples, variants = VDS.count()
    assert variants == 2519L
    assert samples == 0
    HAIL_CONTEXT.stop()

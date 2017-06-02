#!/usr/bin/env python

"""Get HailContext."""

import hail
from hail.representation import Interval

def get_hail_context():
    """Get hail context and load vds."""
    hail_context = hail.HailContext()
    # vds = hail_context.read(vds_path)
    return hail_context

def test(vds_path):
    """Get hail context and load vds."""
    return 'hello'


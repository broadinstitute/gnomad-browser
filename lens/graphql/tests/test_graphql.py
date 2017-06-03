#!/usr/bin/env python

"""GraphQL integration tests"""

from lens.graphql import get_gene_intervals

def test_get_gene_intervals():
    """Fetch gene intervals from gnomad api."""
    intervals = get_gene_intervals('BRCA2')
    assert len(intervals) == 26
    assert intervals[0] == '13:32890599-32890665'



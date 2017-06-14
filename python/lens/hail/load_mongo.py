#!/usr/bin/env python

"""MongoDB loading."""

import pandas
import pymongo

from lens.constants import TEST_GENES
from lens.graphql import get_gene_intervals
from lens.hail.pandas import make_df, format_df_for_loading

def load_variants(hc, vds, genes=TEST_GENES):
    db = pymongo.MongoClient('localhost', 27017)['exac']
    db.hailtest.drop()

    for gene_name in genes:
        print(gene_name)
        intervals = get_gene_intervals(gene_name)
        df = make_df(hc, intervals, vds, split_multi=True)
        df['gene_name'] = gene_name
        df = format_df_for_loading(df)
        records = df.to_dict(orient='records')
        if not len(records) is 0:
          db['hailtest'].insert_many(records)

if __name__ == '__main__':
    print('awwyiss')

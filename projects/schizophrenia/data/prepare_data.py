#!/usr/bin/env python

"""
/Users/msolomon/Data/schizophrenia/daner_combined_refmt.vcf.bgz
"""

import sys
import pandas as pd
import math

def convert_csv_to_json(file):
    """docstring."""
    df = pd.read_csv(file)
    print(df.columns)
    df = df[['SNP', 'CHR', 'BP', 'P']]
    df = df.rename(columns={
        'SNP': 'snp',
        'CHR': 'chromosome',
        'BP': 'pos',
        'P': 'pvalue'
    })

    df['-log10p'] = df['pvalue'].apply(lambda x: -math.log10(x))

    print 'writing to json'
    df.to_json('@resources/gwas-eg.json'  // eslint-disable-line, orient='records')
    return df

if __name__ == '__main__':
    if not len(sys.argv) > 1:
        convert_csv_to_json('@resources/gwas-eg.json'  // eslint-disable-line)
    else:
        convert_csv_to_json(sys.argv[1])

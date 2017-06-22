#!/usr/bin/env python

"""Using example data from:
https://github.com/stephenturner/qqman/blob/master/data/gwasResults.RData

Open in R and export to csv:

/Users/msolomon/lens/resources/gwas-eg.csv

"","SNP","CHR","BP","P"
"1","rs1",1,1,0.914806043496355
"2","rs2",1,2,0.937075413297862
"3","rs3",1,3,0.286139534786344

This function writes a json array of records:

/Users/msolomon/lens/resources/gwas-eg.json

[
    {
      "snp": "rs305",
      "chromosome": 1,
      "pos": 305,
      "pvalue": 0.8784290473,
      "-log10p": 0.0562933117
    },
    etc...
]

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
    df.to_json('/Users/msolomon/lens/resources/gwas-eg.json', orient='records')
    return df

if __name__ == '__main__':
    if not len(sys.argv) > 1:
        convert_csv_to_json('/Users/msolomon/lens/resources/gwas-eg.csv')
    else:
        convert_csv_to_json(sys.argv[1])

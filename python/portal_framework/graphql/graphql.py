#!/usr/bin/env python

"""Tools for querying the gnomad api."""

import requests
import ast
import portal_framework

def get_query(gene_name):
    query = '''{
        gene(gene_name: "%s") {
          gene_name
          chrom
          transcript {
            exons {
              feature_type
              start
              stop
              strand
            }
          }
      }
    }''' % gene_name

    return query

def get_gene_intervals(gene_name, url='http://gnomad-api.broadinstitute.org/'):
    query = get_query(gene_name)
    headers = { "content-type": "application/graphql" }
    response = requests.post(url, data=query, headers=headers)
    parsed = ast.literal_eval(response.text)
    features = parsed['data']['gene']['transcript']['exons']
    chrom = parsed['data']['gene']['chrom']
    exons = filter(lambda feature: feature['feature_type'] == 'CDS', features)
    intervals = map(lambda exon: '%s:%s-%s' % (chrom, exon['start'], exon['stop']), exons)
    return intervals

if __name__ == '__main__':
    print(get_gene_intervals('BRCA2'))
import requests
import pandas
import ast
import pymongo

from make_dataframe import make_df

genes = [
    'BRCA2',
    'PCSK9',
    'ZNF658',
    'MYH9',
    'FMR1',
    'CFTR',
    'FBN1',
    'TP53',
    'SCN5A',
    'MYH7',
    'MYBPC3',
    'ARSF',
    'CD33',
    'DMD',
    'TTN',
    'USH2A',
  ]

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

def split_hgvs(hgvs):
  if hgvs:
    return hgvs.split(':')[1]
  else:
    return None

def format_filters(filters):
  if filters == []:
    return 'PASS'
  else:
    return '|'.join(filters)

def format_df_for_loading(df):
  df['variant_id'] = df['variant_id'].map(lambda id: id.replace('/', '-'))
  df['filters'] = (df['filters'] + df['as_filter_status']).map(set).map(list)
  df['filters'] = df['filters'].map(format_filters)
  df['hgvsp'] = df['hgvsp'].map(split_hgvs)
  df['hgvsc'] = df['hgvsc'].map(split_hgvs)
  columns = [
      'pos',
      'variant_id',
      'rsid',
      'pass',
      'filters',
      'consequence',
      'lof',
      'allele_count',
      'allele_num',
      'allele_freq',
      'hom_count',
      'hgvsp',
      'hgvsc',
      'gene_name',
  ]
  print df[columns]
  return df[columns]

def get_gene_intervals(gene_name):
    query = get_query(gene_name)
    headers = { "content-type": "application/graphql" }
    response = requests.post('http://gnomad-api.broadinstitute.org/', data=query, headers=headers)
    parsed = ast.literal_eval(response.text)
    features = parsed['data']['gene']['transcript']['exons']
    chrom = parsed['data']['gene']['chrom']
    exons = filter(lambda feature: feature['feature_type'] == 'CDS', features)
    intervals = map(lambda exon: '%s:%s-%s' % (chrom, exon['start'], exon['stop']), exons)
    return intervals

def load_variants(hc, vds, genes=genes):
    db = pymongo.MongoClient('localhost', 27017)['exac']
    db.hailtest.drop()

    for gene_name in genes:
        print gene_name
        intervals = get_gene_intervals(gene_name)
        df = make_df(hc, intervals, vds, split_multi=True)
        df['gene_name'] = gene_name
        df = format_df_for_loading(df)
        records = df.to_dict(orient='records')
        if not len(records) is 0:
          db['hailtest'].insert_many(records)

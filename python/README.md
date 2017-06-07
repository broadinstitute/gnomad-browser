DROP KEYSPACE IF EXISTS gnomad;
CREATE KEYSPACE gnomad WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}  AND durable_writes = true;

CREATE TABLE gnomad.exome_variants (
  dataset_5fid text,
  chrom text,
  start int,
  ref text,
  alt text,
  PRIMARY KEY ((chrom, start, ref, alt, dataset_5fid))
);

rsid text,
pass text,
filters text,
as_filter_status text,
consequence text,
lof text,
allele_count int,
allele_num int,
allele_freq text,
hom_count int,
hgvsp text,
hgvsc text,
#!/usr/bin/env python

"""Export variants from vds to cassandra."""

from hail import HailContext
from hail.utils import escape_identifier

from portage.constants import TEST_VDS_PATH

def load_variants_cassandra():
    """docstring."""
    hc = HailContext()

    host = '127.0.0.1'
    port = 9042

    def escaped_export_expr(exprs):
        return ' , '.join(['{} = {}'.format(escape_identifier(e[0]), e[1])
                           for e in exprs])

    vexprs = escaped_export_expr([
        ('dataset_id', '"gnomad_exomes"'),
        ('chrom', 'v.contig'),
        ('start', 'v.start'),
        ('end', 'v.start + v.ref.length - 1'),
        ('ref', 'v.ref'),
        ('alt', 'v.alt'),
        # ('variant_id', 'v.contig + "-" + v.start + "-" + v.altAlleles[0]'),
        ('rsid', 'va.rsid'),
        ('pass', 'va.pass'),
        ('filters', 'va.filters'),
        ('as_filter_status', 'va.info.AS_FilterStatus[0]'),
        ('consequence', 'va.vep.most_severe_consequence'),
        ('lof', 'va.vep.transcript_consequences[0].lof'),
        ('allele_count', 'va.info.AC[0]'),
        ('allele_num', 'va.info.AN'),
        ('allele_freq', 'va.info.AF[0]'),
        ('hom_count', 'va.info.Hom[0]'),
        # 'amino_acids', 'va.vep.transcript_consequences[0].amino_acids'),
        ('hgvsp', 'va.vep.transcript_consequences[0].hgvsp'),
        ('hgvsc', 'va.vep.transcript_consequences[0].hgvsc')])

    vds = hc.read(TEST_VDS_PATH)

    print(vds.variant_schema)
    print(vds.global_schema)
    print(vds.sample_schema)

    split = vds.split_multi()

    cass_kt = split.make_table(vexprs, [], separator='__')

    cass_kt.export_cassandra(host, 'gnomad', 'exome_variants', rate=5000 / 5, port=port)

if __name__ == '__main__':
    load_variants_cassandra()

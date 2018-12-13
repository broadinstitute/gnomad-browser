import fetch from 'graphql-fetch'

const fetchVariantsByGene = (geneName, analysisGroup) => {
  const query = `{
    gene(gene_name: "${geneName}") {
      variants(analysis_group: ${analysisGroup}) {
        ac
        ac_case
        ac_ctrl
        ac_denovo
        af
        allele_freq: af
        af_case
        af_ctrl
        an
        an_case
        an_ctrl
        cadd
        canonical_transcript_id
        chrom
        comment
        consequence
        csq_analysis
        csq_canonical
        csq_worst
        estimate
        flags
        gene_id
        gene_name
        hgvsc
        hgvsc_canonical
        hgvsp
        hgvsp_canonical
        i2
        in_analysis
        mpc
        polyphen
        pos
        pval_meta
        qp
        se
        source
        transcript_id
        variant_id
        xpos
      }
    }
  }
  `

  return fetch('/api')(query)
}

export default fetchVariantsByGene

import fetch from 'graphql-fetch'

const PUBLIC_API = 'http://gnomad-api.broadinstitute.org'
// const API_URL = 'http://localhost:8007'
// const API_URL = 'http://35.184.79.173'
const API_URL = process.env.GNOMAD_API_URL

export const fetchGnomadOnly = (geneName, url = API_URL) => {
  const argument = geneName.startsWith('ENSG') ? `gene_id: "${geneName}"` :
    `gene_name: "${geneName}"`
  const query = `{
    gene(${argument}) {
      gene_id
      gene_name
      omim_accession
      full_gene_name
      start
      stop
      xstart
      xstop
      chrom
      strand
      transcript {
        exons {
          feature_type
          start
          stop
          strand
        }
      }
      gnomadExomeVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
        lcr
        segdup
      }
      gnomadGenomeVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
        lcr
        segdup
      }
      exacVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
      }
      exacv1_regional_constraint_regions {
        transcript
        gene
        chr
        amino_acids
        genomic_start
        genomic_end
        obs_mis
        exp_mis
        obs_exp
        chisq_diff_null
        region_name
      }
      transcript {
        exons {
          feature_type
          start
          stop
          strand
        }
        genome_coverage {
          pos
          mean
        }
        exome_coverage {
          pos
          mean
        }
        exacv1_coverage {
          pos
          mean
        }
      }
    }
}
`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        reject(error)
      })
  })
}
export const fetchExac = (geneName, url = PUBLIC_API) => {
  const argument = geneName.startsWith('ENSG') ? `gene_id: "${geneName}"` :
    `gene_name: "${geneName}"`
  const query = `{
    gene(${argument}) {
      exacv1_constraint {
        mu_syn
        exp_syn
        cnv_z
        pLI
        syn_z
        n_lof
        n_mis
        n_syn
        lof_z
        tx_start
        mu_mis
        transcript
        n_cnv
        exp_lof
        mis_z
        exp_cnv
        tx_end
        n_exons
        mu_lof
        bp
        exp_mis
      }
    }
  }
`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        reject(error)
      })
  })
}

export function fetchWithExac(geneName, options) {
  return Promise.all([
    fetchGnomadOnly(geneName, options),
    fetchExac(geneName),
  ]).then(([localData, publicData]) => {
    return ({
      ...localData,
      ...publicData,
    })
  }).catch(error => console.log(error))
}

import fetch from 'graphql-fetch'

const PUBLIC_API = 'http://gnomad-api.broadinstitute.org'
const API_URL = 'http://localhost:8007'
// const API_URL = 'http://35.185.9.245'


export const fetchGnomadOnly = (geneName, url = API_URL) => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      omim_accession
      full_gene_name
      start
      stop
      xstart
      xstop
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
      exome_coverage {
        pos
        mean
      }
      genome_coverage {
        pos
        mean
      }
      transcript {
        exons {
          feature_type
          start
          stop
          strand
        }
      }
      transcripts {
        _id
        start
        transcript_id
        strand
        stop
        xstart
        chrom
        gene_id
        xstop
        exons {
          _id
          start
          transcript_id
          feature_type
          strand
          stop
          chrom
          gene_id
        }
        gtex_tissue_tpms_by_transcript {
          adiposeSubcutaneous
          adiposeVisceralOmentum
          adrenalGland
          arteryAorta
          arteryCoronary
          arteryTibial
          bladder
          brainAmygdala
          brainAnteriorcingulatecortexBa24
          brainCaudateBasalganglia
          brainCerebellarhemisphere
          brainCerebellum
          brainCortex
          brainFrontalcortexBa9
          brainHippocampus
          brainHypothalamus
          brainNucleusaccumbensBasalganglia
          brainPutamenBasalganglia
          brainSpinalcordCervicalc1
          brainSubstantianigra
          breastMammarytissue
          cellsEbvTransformedlymphocytes
          cellsTransformedfibroblasts
          cervixEctocervix
          cervixEndocervix
          colonSigmoid
          colonTransverse
          esophagusGastroesophagealjunction
          esophagusMucosa
          esophagusMuscularis
          fallopianTube
          heartAtrialappendage
          heartLeftventricle
          kidneyCortex
          liver
          lung
          minorSalivaryGland
          muscleSkeletal
          nerveTibial
          ovary
          pancreas
          pituitary
          prostate
          skinNotsunexposedSuprapubic
          skinSunexposedLowerleg
          smallIntestineTerminalileum
          spleen
          stomach
          testis
          thyroid
          uterus
          vagina
          wholeBlood
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
  const query = `{
    gene(gene_name: "${geneName}") {
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

export function fetchWithExac(geneName) {
  return Promise.all([
    fetchGnomadOnly(geneName),
    fetchExac(geneName),
  ]).then(([localData, publicData]) => {
    return ({
      ...localData,
      ...publicData,
    })
  }).catch(error => console.log(error))
}

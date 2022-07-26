import { gql } from '@apollo/client'

export const GNOMAD_GENE_PAGE_QUERY = gql`
  query Gene(
    $geneId: String
    $geneSymbol: String
    $referenceGenome: ReferenceGenomeId!
    $shortTandemRepeatDatasetId: DatasetId!
    $includeShortTandemRepeats: Boolean!
  ) {
    gene(gene_id: $geneId, gene_symbol: $geneSymbol, reference_genome: $referenceGenome) {
      reference_genome
      gene_id
      gene_version
      symbol
      gencode_symbol
      name
      canonical_transcript_id
      mane_select_transcript {
        ensembl_id
        ensembl_version
        refseq_id
        refseq_version
      }
      hgnc_id
      ncbi_id
      omim_id
      chrom
      start
      stop
      strand
      exons {
        feature_type
        start
        stop
      }
      flags
      gnomad_constraint {
        exp_lof
        exp_mis
        exp_syn
        obs_lof
        obs_mis
        obs_syn
        oe_lof
        oe_lof_lower
        oe_lof_upper
        oe_mis
        oe_mis_lower
        oe_mis_upper
        oe_syn
        oe_syn_lower
        oe_syn_upper
        lof_z
        mis_z
        syn_z
        pLI
        flags
      }
      exac_constraint {
        exp_syn
        obs_syn
        syn_z
        exp_mis
        obs_mis
        mis_z
        exp_lof
        obs_lof
        lof_z
        pLI
      }
      transcripts {
        transcript_id
        transcript_version
        strand
        exons {
          feature_type
          start
          stop
        }
        gtex_tissue_expression {
          adipose_subcutaneous
          adipose_visceral_omentum
          adrenal_gland
          artery_aorta
          artery_coronary
          artery_tibial
          bladder
          brain_amygdala
          brain_anterior_cingulate_cortex_ba24
          brain_caudate_basal_ganglia
          brain_cerebellar_hemisphere
          brain_cerebellum
          brain_cortex
          brain_frontal_cortex_ba9
          brain_hippocampus
          brain_hypothalamus
          brain_nucleus_accumbens_basal_ganglia
          brain_putamen_basal_ganglia
          brain_spinal_cord_cervical_c_1
          brain_substantia_nigra
          breast_mammary_tissue
          cells_ebv_transformed_lymphocytes
          cells_transformed_fibroblasts
          cervix_ectocervix
          cervix_endocervix
          colon_sigmoid
          colon_transverse
          esophagus_gastroesophageal_junction
          esophagus_mucosa
          esophagus_muscularis
          fallopian_tube
          heart_atrial_appendage
          heart_left_ventricle
          kidney_cortex
          liver
          lung
          minor_salivary_gland
          muscle_skeletal
          nerve_tibial
          ovary
          pancreas
          pituitary
          prostate
          skin_not_sun_exposed_suprapubic
          skin_sun_exposed_lower_leg
          small_intestine_terminal_ileum
          spleen
          stomach
          testis
          thyroid
          uterus
          vagina
          whole_blood
        }
      }
      pext {
        regions {
          start
          stop
          mean
          tissues {
            adipose_subcutaneous
            adipose_visceral_omentum
            adrenal_gland
            artery_aorta
            artery_coronary
            artery_tibial
            bladder
            brain_amygdala
            brain_anterior_cingulate_cortex_ba24
            brain_caudate_basal_ganglia
            brain_cerebellar_hemisphere
            brain_cerebellum
            brain_cortex
            brain_frontal_cortex_ba9
            brain_hippocampus
            brain_hypothalamus
            brain_nucleus_accumbens_basal_ganglia
            brain_putamen_basal_ganglia
            brain_spinal_cord_cervical_c_1
            brain_substantia_nigra
            breast_mammary_tissue
            cells_ebv_transformed_lymphocytes
            cells_transformed_fibroblasts
            cervix_ectocervix
            cervix_endocervix
            colon_sigmoid
            colon_transverse
            esophagus_gastroesophageal_junction
            esophagus_mucosa
            esophagus_muscularis
            fallopian_tube
            heart_atrial_appendage
            heart_left_ventricle
            kidney_cortex
            liver
            lung
            minor_salivary_gland
            muscle_skeletal
            nerve_tibial
            ovary
            pancreas
            pituitary
            prostate
            skin_not_sun_exposed_suprapubic
            skin_sun_exposed_lower_leg
            small_intestine_terminal_ileum
            spleen
            stomach
            testis
            thyroid
            uterus
            vagina
            whole_blood
          }
        }
        flags
      }
      exac_regional_missense_constraint_regions {
        start
        stop
        obs_mis
        exp_mis
        obs_exp
        chisq_diff_null
      }
      short_tandem_repeats(dataset: $shortTandemRepeatDatasetId)
        @include(if: $includeShortTandemRepeats) {
        id
      }
    }
  }
`

export const GNOMAD_VARIANT_PAGE_QUERY = gql`
  query GnomadVariant(
    $variantId: String!
    $datasetId: DatasetId!
    $referenceGenome: ReferenceGenomeId!
    $includeLocalAncestry: Boolean!
    $includeLiftoverAsSource: Boolean!
    $includeLiftoverAsTarget: Boolean!
  ) {
    variant(variantId: $variantId, dataset: $datasetId) {
      variant_id
      reference_genome
      chrom
      pos
      ref
      alt
      caid
      colocated_variants
      coverage {
        exome {
          mean
        }
        genome {
          mean
        }
      }
      multi_nucleotide_variants {
        combined_variant_id
        changes_amino_acids
        n_individuals
        other_constituent_snvs
      }
      exome {
        ac
        an
        ac_hemi
        ac_hom
        faf95 {
          popmax
          popmax_population
        }
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
        local_ancestry_populations @include(if: $includeLocalAncestry) {
          id
          ac
          an
        }
        age_distribution {
          het {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
          hom {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        quality_metrics {
          allele_balance {
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          genotype_depth {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          genotype_quality {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          site_quality_metrics {
            metric
            value
          }
        }
      }
      genome {
        ac
        an
        ac_hemi
        ac_hom
        faf95 {
          popmax
          popmax_population
        }
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
        local_ancestry_populations @include(if: $includeLocalAncestry) {
          id
          ac
          an
        }
        age_distribution {
          het {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
          hom {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        quality_metrics {
          allele_balance {
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          genotype_depth {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          genotype_quality {
            all {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
            alt {
              bin_edges
              bin_freq
              n_smaller
              n_larger
            }
          }
          site_quality_metrics {
            metric
            value
          }
        }
      }
      flags
      lof_curations {
        gene_id
        gene_symbol
        verdict
        flags
        project
      }
      rsids
      transcript_consequences {
        domains
        gene_id
        gene_version
        gene_symbol
        hgvs
        hgvsc
        hgvsp
        is_canonical
        is_mane_select
        is_mane_select_version
        lof
        lof_flags
        lof_filter
        major_consequence
        polyphen_prediction
        sift_prediction
        transcript_id
        transcript_version
      }
      in_silico_predictors {
        id
        value
        flags
      }
    }
    clinvar_variant(variant_id: $variantId, reference_genome: $referenceGenome) {
      clinical_significance
      clinvar_variation_id
      gold_stars
      last_evaluated
      review_status
      submissions {
        clinical_significance
        conditions {
          name
          medgen_id
        }
        last_evaluated
        review_status
        submitter_name
      }
    }
    liftover(source_variant_id: $variantId, reference_genome: $referenceGenome)
      @include(if: $includeLiftoverAsSource) {
      liftover {
        variant_id
        reference_genome
      }
      datasets
    }
    liftover_sources: liftover(liftover_variant_id: $variantId, reference_genome: $referenceGenome)
      @include(if: $includeLiftoverAsTarget) {
      source {
        variant_id
        reference_genome
      }
      datasets
    }
    meta {
      clinvar_release_date
    }
  }
`

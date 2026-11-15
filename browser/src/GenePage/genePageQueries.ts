import {
  DatasetId,
  coverageDatasetId,
  genesHaveExomeCoverage,
  genesHaveGenomeCoverage,
  hasShortTandemRepeats,
  referenceGenome,
} from '@gnomad/dataset-metadata/metadata'

// Kept free of React so the static gene page response generator in graphql-api can send byte-identical
// requests: stored responses are keyed by the exact query text and variables.

export const geneOperationName = 'Gene'

export const geneQuery = `
query ${geneOperationName}($geneId: String, $geneSymbol: String, $referenceGenome: ReferenceGenomeId!, $shortTandemRepeatDatasetId: DatasetId!, $includeShortTandemRepeats: Boolean!) {
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
      oe_lof_percentile
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
        tissue
        value
      }
    }
    pext {
      regions {
        start
        stop
        mean
        tissues {
          tissue
          value
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
    gnomad_v2_regional_missense_constraint {
      passed_qc
      has_no_rmc_evidence
      regions {
        chrom
        start
        stop
        aa_start
        aa_stop
        obs_mis
        exp_mis
        obs_exp
        chisq_diff_null
        p_value
      }
    }
    short_tandem_repeats(dataset: $shortTandemRepeatDatasetId) @include(if: $includeShortTandemRepeats) {
      id
    }
    heterozygous_variant_cooccurrence_counts {
      csq
      af_cutoff
      data {
        two_het_total
	in_cis
	in_trans
	unphased
      }
    }
    homozygous_variant_cooccurrence_counts {
      csq
      af_cutoff
      data {
	hom_total
      }
    }
    mitochondrial_constraint {
      ...on ProteinMitochondrialGeneConstraint {
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
      }

      ...on RNAMitochondrialGeneConstraint {
        observed
        expected
        oe
        oe_upper
        oe_lower
      }
    }

    mitochondrial_missense_constraint_regions{
      start
      stop
      oe
      oe_upper
      oe_lower
    }
  }
}
`

export const buildGeneVariables = (datasetId: DatasetId, geneIdOrSymbol: string) => ({
  [geneIdOrSymbol.startsWith('ENSG') ? 'geneId' : 'geneSymbol']: geneIdOrSymbol,
  referenceGenome: referenceGenome(datasetId),
  shortTandemRepeatDatasetId: 'gnomad_r3',
  includeShortTandemRepeats: hasShortTandemRepeats(datasetId),
})

export const variantsInGeneOperationName = 'VariantsInGene'

export const variantsInGeneQuery = `
query ${variantsInGeneOperationName}($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  meta {
    clinvar_release_date
  }
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
    clinvar_variants {
      clinical_significance
      clinvar_variation_id
      gnomad {
        exome {
          ac
          an
          filters
        }
        genome {
          ac
          an
          filters
        }
      }
      gold_stars
      hgvsc
      hgvsp
      in_gnomad
      major_consequence
      pos
      review_status
      transcript_id
      variant_id
    }
    variants(dataset: $datasetId) {
      consequence
      flags
      hgvs
      hgvsc
      hgvsp
      lof
      lof_filter
      lof_flags
      pos
      rsids
      transcript_id
      transcript_version
      variant_id
      faf95_joint {
        popmax
        popmax_population
      }
      exome {
        ac
        ac_hemi
        ac_hom
        faf95 {
          popmax
          popmax_population
        }
        an
        af
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
        fafmax {
          faf95_max
          faf95_max_gen_anc
          faf99_max
          faf99_max_gen_anc
        }
	flags
      }
      genome {
        ac
        ac_hemi
        ac_hom
        faf95 {
          popmax
          popmax_population
        }
        an
        af
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
	flags
      }
      joint {
        ac
        hemizygote_count
        homozygote_count
        fafmax {
          faf95_max
          faf95_max_gen_anc
          faf99_max
          faf99_max_gen_anc
        }
        an
        filters
        populations {
          id
          ac
          an
          homozygote_count
          hemizygote_count
        }
      }
      in_silico_predictors {
        id
        value
        flags
      }
      lof_curation {
        verdict
        flags
      }
    }
  }
}`

export const buildVariantsInGeneVariables = (datasetId: DatasetId, geneId: string) => ({
  datasetId,
  geneId,
  referenceGenome: referenceGenome(datasetId),
})

export const geneCoverageOperationName = 'GeneCoverage'

export const geneCoverageQuery = `
query ${geneCoverageOperationName}($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
    coverage(dataset: $datasetId) {
      exome @include(if: $includeExomeCoverage) {
        pos
        mean
        median
        over_1
        over_5
        over_10
        over_15
        over_20
        over_25
        over_30
        over_50
        over_100
      }
      genome @include(if: $includeGenomeCoverage) {
        pos
        mean
        median
        over_1
        over_5
        over_10
        over_15
        over_20
        over_25
        over_30
        over_50
        over_100
      }
    }
  }
}
`

export const geneCoverageFlags = (datasetId: DatasetId) => ({
  includeExomeCoverage: genesHaveExomeCoverage(datasetId),
  includeGenomeCoverage: genesHaveGenomeCoverage(datasetId),
})

export const buildGeneCoverageVariables = (
  datasetId: DatasetId,
  geneId: string,
  {
    includeExomeCoverage,
    includeGenomeCoverage,
  }: { includeExomeCoverage: boolean; includeGenomeCoverage: boolean }
) => ({
  geneId,
  datasetId: coverageDatasetId(datasetId),
  referenceGenome: referenceGenome(coverageDatasetId(datasetId)),
  includeExomeCoverage,
  includeGenomeCoverage,
})

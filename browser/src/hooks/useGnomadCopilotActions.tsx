import React from 'react'
import { useCopilotAction } from '@copilotkit/react-core'
import { GnomadVariantOccurrenceTable } from '../VariantPage/VariantOccurrenceTable'
import { Variant } from '../VariantPage/VariantPage'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

// Function to transform snake_case API data to camelCase props expected by VariantOccurrenceTable
const adaptApiDataToComponentProps = (apiData: any): Variant => {
  // Transform the top-level variant data
  const variant: Variant = {
    variant_id: apiData.variant_id || apiData.variantId,
    reference_genome: apiData.reference_genome || apiData.referenceGenome || 'GRCh38',
    colocated_variants: apiData.colocated_variants || apiData.colocatedVariants || null,
    faf95_joint: apiData.faf95_joint || apiData.faf95Joint || { popmax: null, popmax_population: null },
    chrom: apiData.chrom || apiData.chromosome,
    pos: apiData.pos || apiData.position,
    ref: apiData.ref || apiData.reference,
    alt: apiData.alt || apiData.alternate,
    flags: apiData.flags || null,
    clinvar: apiData.clinvar || null,
    exome: apiData.exome ? {
      ac: apiData.exome.ac || 0,
      an: apiData.exome.an || 0,
      homozygote_count: apiData.exome.homozygote_count || apiData.exome.nhomalt || 0,
      hemizygote_count: apiData.exome.hemizygote_count || 0,
      ac_hom: apiData.exome.ac_hom || apiData.exome.nhomalt || 0,
      ac_hemi: apiData.exome.ac_hemi || 0,
      faf95: apiData.exome.faf95 || { popmax: null, popmax_population: null },
      filters: apiData.exome.filters || [],
      populations: apiData.exome.populations || [],
      age_distribution: apiData.exome.age_distribution || null,
      flags: apiData.exome.flags || null,
      quality_metrics: {
        allele_balance: {
          alt: apiData.exome.quality_metrics?.allele_balance?.alt || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          }
        },
        genotype_depth: {
          all: apiData.exome.quality_metrics?.genotype_depth?.all || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          },
          alt: apiData.exome.quality_metrics?.genotype_depth?.alt || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          }
        },
        genotype_quality: {
          all: apiData.exome.quality_metrics?.genotype_quality?.all || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          },
          alt: apiData.exome.quality_metrics?.genotype_quality?.alt || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          }
        },
        site_quality_metrics: apiData.exome.quality_metrics?.site_quality_metrics || []
      },
      local_ancestry_populations: apiData.exome.local_ancestry_populations || []
    } : null,
    genome: apiData.genome ? {
      ac: apiData.genome.ac || 0,
      an: apiData.genome.an || 0,
      homozygote_count: apiData.genome.homozygote_count || apiData.genome.nhomalt || 0,
      hemizygote_count: apiData.genome.hemizygote_count || 0,
      ac_hom: apiData.genome.ac_hom || apiData.genome.nhomalt || 0,
      ac_hemi: apiData.genome.ac_hemi || 0,
      faf95: apiData.genome.faf95 || { popmax: null, popmax_population: null },
      filters: apiData.genome.filters || [],
      populations: apiData.genome.populations || [],
      age_distribution: apiData.genome.age_distribution || null,
      flags: apiData.genome.flags || null,
      quality_metrics: {
        allele_balance: {
          alt: apiData.genome.quality_metrics?.allele_balance?.alt || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          }
        },
        genotype_depth: {
          all: apiData.genome.quality_metrics?.genotype_depth?.all || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          },
          alt: apiData.genome.quality_metrics?.genotype_depth?.alt || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          }
        },
        genotype_quality: {
          all: apiData.genome.quality_metrics?.genotype_quality?.all || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          },
          alt: apiData.genome.quality_metrics?.genotype_quality?.alt || {
            bin_edges: [],
            bin_freq: [],
            n_smaller: 0,
            n_larger: 0
          }
        },
        site_quality_metrics: apiData.genome.quality_metrics?.site_quality_metrics || []
      },
      local_ancestry_populations: apiData.genome.local_ancestry_populations || []
    } : null,
    joint: apiData.joint || null,
    lof_curations: apiData.lof_curations || null,
    in_silico_predictors: apiData.in_silico_predictors || null,
    transcript_consequences: apiData.transcript_consequences || null,
    liftover: apiData.liftover || null,
    liftover_sources: apiData.liftover_sources || null,
    multi_nucleotide_variants: apiData.multi_nucleotide_variants,
    caid: apiData.caid || null,
    rsids: apiData.rsids || null,
    coverage: {
      exome: apiData.coverage?.exome || null,
      genome: apiData.coverage?.genome || null
    },
    non_coding_constraint: apiData.non_coding_constraint || null
  }

  return variant
}

export function useGnomadCopilotActions() {
  useCopilotAction({
    name: 'get_variant_summary',
    description: 'Fetches and displays a summary of population frequencies for a specific gnomAD variant.',
    parameters: [
      {
        name: 'variant_id',
        type: 'string',
        description: 'The variant ID, e.g., 1-55051215-G-GA or an rsID.',
        required: true,
      },
      {
        name: 'dataset',
        type: 'string', 
        description: 'The gnomAD dataset to query (e.g., gnomad_r4, gnomad_r3).',
        required: false,
      },
    ],
    handler: async ({ variant_id, dataset }) => {
      // Get the current dataset from URL if not provided
      const currentUrl = new URL(window.location.href)
      const datasetId = dataset || currentUrl.searchParams.get('dataset') || 'gnomad_r4'
      
      // Return parameters that match the MCP tool's expected format
      return { variant_id, dataset: datasetId }
    },
    render: ({ status, result }) => {
      if (status === 'inProgress') {
        return (
          <div className="chat-component-container">
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '0.5rem' }}>Fetching variant data...</div>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Loading population frequencies</div>
            </div>
          </div>
        )
      }

      if (status === 'complete' && result) {
        const variantData = adaptApiDataToComponentProps(result)
        // Get the current dataset from URL for display purposes
        const currentUrl = new URL(window.location.href)
        const datasetId = (currentUrl.searchParams.get('dataset') || 'gnomad_r4') as DatasetId
        
        return (
          <div className="chat-component-container">
            <h4 style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              Occurrence Data for {result.variant_id || result.variantId}
            </h4>
            <GnomadVariantOccurrenceTable 
              variant={variantData} 
              datasetId={datasetId}
              showExomes={true}
              showGenomes={true}
            />
          </div>
        )
      }

      return <></> // Return empty React fragment instead of null
    },
  })
}
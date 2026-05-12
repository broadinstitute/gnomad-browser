import React, { useState } from 'react'
import styled from 'styled-components'

import { DatasetId, labelForDataset, referenceGenome, isLongRead, associatedLongReadDataset } from '@gnomad/dataset-metadata/metadata'
import { SegmentedControl } from '@gnomad/ui'
import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import LongReadHaplotypeView from '../LongReadVariantPage/LongReadHaplotypeView'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { TrackPageSection } from '../TrackPage'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
import mergeLongReadVariants from '../VariantList/mergeLongReadVariants'
import Variants from '../VariantList/Variants'

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`

type OwnVariantsInRegionProps = {
  clinvarReleaseDate: string
  clinvarVariants?: any[]
  datasetId: DatasetId
  lrDatasetId?: DatasetId | null
  region: {
    chrom: string
    start: number
    stop: number
    genes: {
      transcripts: any[]
    }[]
  }
  variants: any[]
  zoomRegion?: {
    start: number
    stop: number
  }
}

// @ts-expect-error TS(2456) FIXME: Type alias 'VariantsInRegionProps' circularly refe... Remove this comment to see the full error message
type VariantsInRegionProps = OwnVariantsInRegionProps & typeof VariantsInRegion.defaultProps

// @ts-expect-error TS(7022) FIXME: 'VariantsInRegion' implicitly has type 'any' becau... Remove this comment to see the full error message
const VariantsInRegion = ({
  clinvarReleaseDate,
  clinvarVariants,
  datasetId,
  lrDatasetId,
  region,
  variants,
  zoomRegion,
}: VariantsInRegionProps) => {
  const datasetLabel = labelForDataset(datasetId)
  const [viewMode, setViewMode] = useState<'summary' | 'haplotype'>('summary')

  return (
    <>
      {lrDatasetId && (
        <TrackPageSection>
          <ToggleWrapper>
            <SegmentedControl
              id="lr-region-view-mode"
              options={[
                { label: 'Variant Table', value: 'summary' },
                { label: 'Phased Haplotypes', value: 'haplotype' },
              ]}
              value={viewMode}
              onChange={(value: string) => setViewMode(value as 'summary' | 'haplotype')}
            />
          </ToggleWrapper>
        </TrackPageSection>
      )}

      {viewMode === 'haplotype' && lrDatasetId ? (
        <LongReadHaplotypeView
          datasetId={lrDatasetId}
          gene={{ chrom: region.chrom, start: region.start, stop: region.stop }}
          zoomRegion={zoomRegion}
        />
      ) : (
        <>
          <TrackPageSection>
            <h2>ClinVar variants</h2>
          </TrackPageSection>
          {clinvarVariants.length > 0 ? (
            <>
              <ClinvarVariantTrack
                referenceGenome={referenceGenome(datasetId)}
                transcripts={region.genes.flatMap((gene: any) => gene.transcripts)}
                variants={filterVariantsInZoomRegion(clinvarVariants, zoomRegion)}
              />
              <TrackPageSection as="p">
                Data displayed here is from ClinVar&apos;s {formatClinvarDate(clinvarReleaseDate)}{' '}
                release.
              </TrackPageSection>
            </>
          ) : (
            <TrackPageSection as="p">No ClinVar variants found in this region.</TrackPageSection>
          )}

          <Variants
            clinvarReleaseDate={clinvarReleaseDate}
            context={region}
            datasetId={datasetId}
            exportFileName={`${datasetLabel}_${region.chrom}-${region.start}-${region.stop}`}
            variants={filterVariantsInZoomRegion(variants, zoomRegion)}
          />
        </>
      )}
    </>
  )
}

VariantsInRegion.defaultProps = {
  clinvarVariants: null,
  zoomRegion: null,
}

const operationName = 'VariantInRegion'

const shortReadVariantFields = `
      consequence
      flags
      gene_id
      gene_symbol
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
`

const longReadVariantFields = `
      variant_id
      pos
      end
      length
      allele_type
      filters
      motifs
      main_reference_region {
        chrom
        start
        stop
      }
      rsids
      cadd_phred
      phylop
      sv_consequences
      freq {
        all {
          ac
          an
          af
          homozygote_ref_count
          homozygote_alt_count
          heterozygote_count
          homozygote_ref_freq
          homozygote_alt_freq
          heterozygote_freq
        }
      }
      transcript_consequences {
        hgvs
        major_consequence
      }
      major_consequence
      short_read_match_id
      enveloping_tr_id
      enveloped_ids
`

const buildQuery = (hasLongRead: boolean) => {
  const variantSubquery = `variants(dataset: $datasetId) { ${shortReadVariantFields} }`
  const lrSubquery = hasLongRead
    ? `long_read_variants(dataset: $lrDatasetId) { ${longReadVariantFields} }`
    : ''
  const lrVariable = hasLongRead ? ', $lrDatasetId: DatasetId!' : ''

  return `
query ${operationName}($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!${lrVariable}, $referenceGenome: ReferenceGenomeId!) {
  meta {
    clinvar_release_date
  }
  region(start: $start, stop: $stop, chrom: $chrom, reference_genome: $referenceGenome) {
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
    ${variantSubquery}
    ${lrSubquery}
  }
}`
}

type ConnectedVariantsInRegionProps = {
  datasetId: DatasetId
  region: {
    chrom: string
    start: number
    stop: number
    genes: {
      transcripts: any[]
    }[]
  }
  zoomRegion?: { start: number; stop: number } | null
}

const ConnectedVariantsInRegion = ({ datasetId, region, zoomRegion }: ConnectedVariantsInRegionProps) => {
  const lrDatasetId = associatedLongReadDataset(datasetId) || (isLongRead(datasetId) ? datasetId : null)
  const hasLongRead = !!lrDatasetId
  const srDatasetId = isLongRead(datasetId) ? ('gnomad_r4' as DatasetId) : datasetId

  return (
    <Query
      operationName={operationName}
      query={buildQuery(hasLongRead)}
      variables={{
        datasetId: srDatasetId,
        chrom: region.chrom,
        start: region.start,
        stop: region.stop,
        referenceGenome: referenceGenome(datasetId),
        ...(hasLongRead && { lrDatasetId }),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.region && data.region.variants}
    >
      {({ data }: any) => {
        let variants = annotateVariantsWithClinvar(data.region.variants, data.region.clinvar_variants)

        if (hasLongRead && data.region.long_read_variants) {
          variants = mergeLongReadVariants(variants, data.region.long_read_variants)
        }

        return (
          <VariantsInRegion
            clinvarReleaseDate={data.meta.clinvar_release_date}
            clinvarVariants={data.region.clinvar_variants}
            datasetId={srDatasetId}
            lrDatasetId={lrDatasetId}
            region={region}
            variants={variants}
          />
        )
      }}
    </Query>
  )
}

export default ConnectedVariantsInRegion

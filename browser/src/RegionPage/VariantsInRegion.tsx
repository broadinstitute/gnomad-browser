import React from 'react'

import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { TrackPageSection } from '../TrackPage'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
import Variants from '../VariantList/Variants'

type OwnVariantsInRegionProps = {
  clinvarReleaseDate: string
  clinvarVariants?: any[]
  datasetId: string
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
  region,
  variants,
  zoomRegion,
}: VariantsInRegionProps) => {
  const datasetLabel = labelForDataset(datasetId)

  return (
    <>
      <TrackPageSection>
        <h2>ClinVar variants</h2>
      </TrackPageSection>
      {clinvarVariants.length > 0 ? (
        <>
          <ClinvarVariantTrack
            referenceGenome={referenceGenomeForDataset(datasetId)}
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
  )
}

VariantsInRegion.defaultProps = {
  clinvarVariants: null,
  zoomRegion: null,
}

const query = `
query VariantInRegion($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
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
    variants(dataset: $datasetId) {
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
      exome {
        ac
        ac_hemi
        ac_hom
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
      }
      genome {
        ac
        ac_hemi
        ac_hom
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
      }
      lof_curation {
        verdict
        flags
      }
    }
  }
}`

type ConnectedVariantsInRegionProps = {
  datasetId: string
  region: {
    chrom: string
    start: number
    stop: number
  }
}

const ConnectedVariantsInRegion = ({ datasetId, region }: ConnectedVariantsInRegionProps) => (
  <Query
    query={query}
    variables={{
      datasetId,
      chrom: region.chrom,
      start: region.start,
      stop: region.stop,
      referenceGenome: referenceGenomeForDataset(datasetId),
    }}
    loadingMessage="Loading variants"
    errorMessage="Unable to load variants"
    success={(data: any) => data.region && data.region.variants}
  >
    {({ data }: any) => {
      return (
        <VariantsInRegion
          clinvarReleaseDate={data.meta.clinvar_release_date}
          clinvarVariants={data.region.clinvar_variants}
          datasetId={datasetId}
          region={region}
          variants={annotateVariantsWithClinvar(data.region.variants, data.region.clinvar_variants)}
        />
      )
    }}
  </Query>
)

export default ConnectedVariantsInRegion

import React from 'react'

import {
  labelForDataset,
  referenceGenome,
  DatasetId,
  hasMitochondrialVariants,
} from '@gnomad/dataset-metadata/metadata'
import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import Link from '../Link'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import MitochondrialVariants from '../MitochondrialVariantList/MitochondrialVariants'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
import { Region } from './RegionPage'

const operationName = 'MitochondrialVariantsInRegion'
const query = `
query ${operationName}($start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  meta {
    clinvar_release_date
  }
  region(chrom: "M", start: $start, stop: $stop, reference_genome: $referenceGenome) {
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
    mitochondrial_variants(dataset: $datasetId) {
      ac_het
      ac_hom
      an
      consequence
      filters
      flags
      gene_id
      gene_symbol
      transcript_id
      hgvsc
      hgvsp
      lof
      lof_filter
      lof_flags
      max_heteroplasmy
      pos
      reference_genome
      variant_id
    }
  }
}
`

type Props = {
  datasetId: DatasetId
  region: Region
  zoomRegion?: {
    start: number
    stop: number
  } | null
}

const MitochondrialVariantsInRegion = ({ datasetId, region, zoomRegion, ...rest }: Props) => {
  const regionId = `${region.chrom}-${region.start}-${region.stop}`
  if (!hasMitochondrialVariants(datasetId)) {
    return (
      <StatusMessage>
        Mitochondrial variants are not available in {labelForDataset(datasetId)}
        <br />
        <br />
        <Link to={`/region/${regionId}?dataset=gnomad_r3`} preserveSelectedDataset={false}>
          View this region in gnomAD v3.1 to see mitochondrial variants
        </Link>
      </StatusMessage>
    )
  }

  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{
        datasetId,
        start: region.start,
        stop: region.stop,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.region && data.region.mitochondrial_variants}
    >
      {({ data }: any) => {
        data.region.mitochondrial_variants.forEach((v: any) => {
          /* eslint-disable no-param-reassign */
          if (v.an !== 0) {
            v.af = (v.ac_het + v.ac_hom) / v.an
            v.af_het = v.ac_het / v.an
            v.af_hom = v.ac_hom / v.an
          } else {
            v.af = 0
            v.af_het = 0
            v.af_hom = 0
          }
          v.hgvs = v.hgvsp || v.hgvsc
          /* eslint-enable no-param-reassign */
        })

        return (
          <>
            <TrackPageSection>
              <h2>ClinVar variants</h2>
            </TrackPageSection>
            {data.region.clinvar_variants.length > 0 ? (
              <>
                <ClinvarVariantTrack
                  referenceGenome={referenceGenome(datasetId)}
                  transcripts={region.genes.flatMap((gene: any) => gene.transcripts)}
                  variants={filterVariantsInZoomRegion(data.region.clinvar_variants, zoomRegion)}
                />
                <TrackPageSection as="p">
                  Data displayed here is from ClinVar&apos;s{' '}
                  {formatClinvarDate(data.meta.clinvar_release_date)} release.
                </TrackPageSection>
              </>
            ) : (
              <TrackPageSection as="p">No ClinVar variants found in this region.</TrackPageSection>
            )}

            <MitochondrialVariants
              {...rest}
              clinvarReleaseDate={data.meta.clinvar_release_date}
              context={region}
              exportFileName={`gnomad_mitochondrial_variants_${regionId}`}
              variants={filterVariantsInZoomRegion(
                annotateVariantsWithClinvar(
                  data.region.mitochondrial_variants,
                  data.region.clinvar_variants
                ),
                zoomRegion
              )}
            />
          </>
        )
      }}
    </Query>
  )
}

export default MitochondrialVariantsInRegion

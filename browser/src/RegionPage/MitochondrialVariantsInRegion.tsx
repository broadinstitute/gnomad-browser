import React, { useMemo } from 'react'

import {
  labelForDataset,
  referenceGenome,
  DatasetId,
  hasMitochondrialVariants,
} from '@gnomad/dataset-metadata/metadata'
import ClinvarVariants from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import { MitochondrialVariant } from '../MitochondrialVariantPage/MitochondrialVariantPage'
import useLinkedMitochondrialVariantSelection from '../MitochondrialVariantList/useLinkedMitochondrialVariantSelection'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import Link from '../Link'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import StatusMessage from '../StatusMessage'
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

type MitochondrialVariantsInRegionProps = Props & {
  clinvarReleaseDate: string
  clinvarVariants: ClinvarVariant[] | null | undefined
  variants: MitochondrialVariant[]
}

const MitochondrialVariantsInRegionView = ({
  datasetId,
  region,
  clinvarReleaseDate,
  clinvarVariants,
  variants,
}: MitochondrialVariantsInRegionProps) => {
  const regionId = `${region.chrom}-${region.start}-${region.stop}`
  const transcripts = useMemo(
    () => region.genes.flatMap((gene) => gene.transcripts),
    [region.genes]
  )
  const selection = useLinkedMitochondrialVariantSelection({
    clinvarVariants,
    variants,
    context: region,
    clinvarReleaseDate,
  })

  return (
    <>
      <ClinvarVariants
        clinvarVariants={clinvarVariants}
        clinvarReleaseDate={clinvarReleaseDate}
        referenceGenome={referenceGenome(datasetId)}
        transcripts={transcripts}
        pageType="region"
        selection={selection.clinvar}
        sync={selection.sync}
      />
      <MitochondrialVariants
        context={region}
        exportFileName={`gnomad_mitochondrial_variants_${regionId}`}
        selection={selection.gnomad}
        sync={selection.sync}
      />
    </>
  )
}

const MitochondrialVariantsInRegion = ({ datasetId, region, zoomRegion }: Props) => {
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
          <MitochondrialVariantsInRegionView
            key={`${datasetId}:${referenceGenome(datasetId)}:${regionId}`}
            datasetId={datasetId}
            region={region}
            clinvarReleaseDate={data.meta.clinvar_release_date}
            clinvarVariants={
              data.region.clinvar_variants &&
              filterVariantsInZoomRegion(data.region.clinvar_variants, zoomRegion)
            }
            variants={filterVariantsInZoomRegion(
              annotateVariantsWithClinvar(
                data.region.mitochondrial_variants,
                data.region.clinvar_variants
              ),
              zoomRegion
            )}
          />
        )
      }}
    </Query>
  )
}

export default MitochondrialVariantsInRegion

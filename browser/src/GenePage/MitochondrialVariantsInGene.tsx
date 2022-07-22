import React from 'react'

import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Link from '../Link'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import MitochondrialVariants from '../MitochondrialVariantList/MitochondrialVariants'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'

const query = `
query MitochondrialVariantsInGene($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
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

type OwnProps = {
  datasetId: string
  gene: {
    gene_id: string
    transcripts?: any[]
  }
  zoomRegion?: {
    start: number
    stop: number
  }
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof MitochondrialVariantsInGene.defaultProps

// @ts-expect-error TS(7022) FIXME: 'MitochondrialVariantsInGene' implicitly has type ... Remove this comment to see the full error message
const MitochondrialVariantsInGene = ({ datasetId, gene, zoomRegion, ...rest }: Props) => {
  if (datasetId === 'exac' || datasetId.startsWith('gnomad_r2')) {
    return (
      <StatusMessage>
        Mitochondrial variants are not available in {labelForDataset(datasetId)}
        <br />
        <br />
        <Link to={`/gene/${gene.gene_id}?dataset=gnomad_r3`} preserveSelectedDataset={false}>
          View this gene in gnomAD v3.1 to see mitochondrial variants
        </Link>
      </StatusMessage>
    )
  }

  return (
    <Query
      query={query}
      variables={{
        datasetId,
        geneId: gene.gene_id,
        referenceGenome: referenceGenomeForDataset(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) => data.gene && data.gene.mitochondrial_variants}
    >
      {({ data }: any) => {
        data.gene.mitochondrial_variants.forEach((v: any) => {
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
            {data.gene.clinvar_variants.length > 0 ? (
              <>
                <ClinvarVariantTrack
                  referenceGenome={referenceGenomeForDataset(datasetId)}
                  transcripts={gene.transcripts}
                  variants={filterVariantsInZoomRegion(data.gene.clinvar_variants, zoomRegion)}
                />
                <TrackPageSection as="p" style={{ margin: 0 }}>
                  Data displayed here is from ClinVar&apos;s{' '}
                  {formatClinvarDate(data.meta.clinvar_release_date)} release.
                </TrackPageSection>
              </>
            ) : (
              <TrackPageSection as="p">No ClinVar variants found in this gene.</TrackPageSection>
            )}

            <MitochondrialVariants
              {...rest}
              clinvarReleaseDate={data.meta.clinvar_release_date}
              context={gene}
              datasetId={datasetId}
              exportFileName={`gnomad_mitochondrial_variants_${gene.gene_id}`}
              variants={filterVariantsInZoomRegion(
                annotateVariantsWithClinvar(
                  data.gene.mitochondrial_variants,
                  data.gene.clinvar_variants
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

MitochondrialVariantsInGene.defaultProps = {
  zoomRegion: null,
}

export default MitochondrialVariantsInGene

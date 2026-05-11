import React from 'react'

import { DatasetId, labelForDataset, referenceGenome, isLongRead } from '@gnomad/dataset-metadata/metadata'
import ClinvarVariantTrack from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import LongReadUnifiedView from '../LongReadVariantPage/LongReadUnifiedView'
import Query from '../Query'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { TrackPageSection } from '../TrackPage'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
import Variants from '../VariantList/Variants'

type OwnVariantsInRegionProps = {
  clinvarReleaseDate: string
  clinvarVariants?: any[]
  datasetId: DatasetId
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
  )
}

VariantsInRegion.defaultProps = {
  clinvarVariants: null,
  zoomRegion: null,
}

const operationName = 'VariantInRegion'

const shortReadVariantSubquery = `
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
`

const longReadVariantSubquery = `
    long_read_variants(dataset: $datasetId) {
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
    }
`

const query = (variantSubquery: string) => `
query ${operationName}($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
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
  }
}`

type ConnectedVariantsInRegionProps = {
  datasetId: DatasetId
  region: {
    chrom: string
    start: number
    stop: number
  }
  zoomRegion?: { start: number; stop: number } | null
}

const ConnectedVariantsInRegion = ({ datasetId, region, zoomRegion }: ConnectedVariantsInRegionProps) => {
  const longRead = isLongRead(datasetId)

  return (
    <Query
      operationName={operationName}
      query={longRead ? query(longReadVariantSubquery) : query(shortReadVariantSubquery)}
      variables={{
        datasetId,
        chrom: region.chrom,
        start: region.start,
        stop: region.stop,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      success={(data: any) =>
        data.region && (longRead ? data.region.long_read_variants : data.region.variants)
      }
    >
      {({ data }: any) => {
        if (longRead) {
          return (
            <LongReadUnifiedView
              datasetId={datasetId}
              gene={{ chrom: region.chrom, start: region.start, stop: region.stop }}
              variants={data.region.long_read_variants}
              zoomRegion={zoomRegion}
              clinvarReleaseDate={data.meta.clinvar_release_date}
            />
          )
        }

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
}

export default ConnectedVariantsInRegion

import React from 'react'
import { useLocation } from 'react-router-dom'

import { DatasetId, referenceGenome } from '@gnomad/dataset-metadata/metadata'
import LongReadUnifiedView from '../LongReadVariantPage/LongReadUnifiedView'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import Query from '../Query'
import RequestRevalidationFrame from '../RequestRevalidationFrame'
import { variantSearchFromUrl } from '../RegionPage/variantSearchParam'
import type { Gene } from './GenePage'

// LR gene pages intentionally use the Region resolver. Gene.long_read_variants
// retains the historical exon/CDS-shaped query used by mixed short-read views,
// while an LR page must load the gene's complete genomic interval.
const query = `
  query LongReadVariantsInGene($datasetId: DatasetId!, $lrCohort: LongReadCohort!, $chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
    meta { clinvar_release_date }
    long_read_y1_provenance(lr_cohort: $lrCohort, chrom: $chrom) {
      enabled scope_label
      sources {
        modality source database release cohort reference_genome chromosome scope run_id status available label
      }
    }
    region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
      long_read_variants(dataset: $datasetId, lr_cohort: $lrCohort) {
        variant_id source_variant_id alt_index lr_cohort chrom pos end length ref alt allele_type filters motifs rsids
        main_reference_region { chrom start stop }
        sv_consequences major_consequence cadd_phred phylop
        freq {
          all { ac an af homozygote_ref_count homozygote_alt_count heterozygote_count }
          populations { id ac an af }
        }
        transcript_consequences { hgvs major_consequence gene_id gene_symbol transcript_id }
        short_read_match_id enveloping_tr_id enveloped_ids
        is_likely_tr gnomad_str
      }
    }
  }
`

type Props = {
  datasetId: DatasetId
  gene: Gene
  zoomRegion: { start: number; stop: number } | null
  onChangeZoomRegion: (region: { start: number; stop: number } | null) => void
  onSetRegion: (region: { start: number; stop: number }) => void
  lrCohort: LongReadCohort
  onChangeLrCohort: (cohort: LongReadCohort) => void
  onGenealogyPanelVisibilityChange: (visible: boolean) => void
}

const LongReadVariantsInGene = ({
  datasetId,
  gene,
  zoomRegion,
  onChangeZoomRegion,
  onSetRegion,
  lrCohort,
  onChangeLrCohort,
  onGenealogyPanelVisibilityChange,
}: Props) => {
  const location = useLocation()
  const variantSearch = variantSearchFromUrl(location.search)

  return (
    <Query
      operationName="LongReadVariantsInGene"
      query={query}
      variables={{
        datasetId,
        lrCohort,
        chrom: gene.chrom,
        start: gene.start,
        stop: gene.stop,
        referenceGenome: referenceGenome(datasetId),
      }}
      loadingMessage="Loading variants"
      errorMessage="Unable to load variants"
      retainPreviousData
      success={(data: any) => data.region}
    >
      {({ data, requestVariables, stale }: any) => {
        const loadedLrCohort = requestVariables?.lrCohort || lrCohort
        return (
          <RequestRevalidationFrame
            stale={stale}
            testId="lr-request-shell"
            message={`Updating long-read variants for ${
              lrCohort === 'aou' ? 'All of Us' : 'HGSVC/HPRC'
            }…`}
            focusAfterUpdateSelector='[role="group"][aria-labelledby="lr-cohort-label"] input:checked'
          >
            <LongReadUnifiedView
              key={loadedLrCohort}
              datasetId={datasetId}
              gene={gene}
              variants={data.region.long_read_variants || []}
              variantSearch={variantSearch}
              lrCohort={loadedLrCohort}
              onChangeLrCohort={onChangeLrCohort}
              provenance={data.long_read_y1_provenance}
              clinvarReleaseDate={data.meta.clinvar_release_date}
              genes={[gene]}
              zoomRegion={zoomRegion}
              onChangeZoomRegion={onChangeZoomRegion}
              onSetRegion={onSetRegion}
              onGenealogyPanelVisibilityChange={onGenealogyPanelVisibilityChange}
            />
          </RequestRevalidationFrame>
        )
      }}
    </Query>
  )
}

export default LongReadVariantsInGene

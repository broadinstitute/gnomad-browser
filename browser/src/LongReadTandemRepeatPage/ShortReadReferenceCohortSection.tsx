import React, { useState } from 'react'
import styled from 'styled-components'

import { Button } from '@gnomad/ui'

import Query from '../Query'
import ShortReadStrDistributionPanel, {
  ShortReadDistributionPart,
} from '../ShortTandemRepeatPage/ShortReadStrDistributionPanel'
import {
  GenotypeDistributionCohort,
  V3AlleleSizeDistributionCohort,
} from '../ShortTandemRepeatPage/ShortTandemRepeatPage'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import { LongReadTrShortReadContext } from './types'

const operationName = 'LongReadTrShortReadDistributions'

export const longReadTrShortReadDistributionsQuery = `
query ${operationName}($id: String!, $lrCohort: LongReadCohort!) {
  long_read_tandem_repeat_short_read_distributions(id: $id, lr_cohort: $lrCohort) {
    status reason_code short_id matched_component_index reference_repeat_unit reference_repeat_count
    distribution_digest source_serialized_bytes source_total_bins
    matched_component { chrom start0 end0 motif }
    main_reference_region { reference_genome chrom start stop }
    allele {
      status reason_code returned_rows returned_bins serialized_bytes
      distributions {
        ancestry_group sex repunit quality_description q_score
        distribution { repunit_count frequency }
      }
    }
    genotype {
      status reason_code returned_rows returned_bins serialized_bytes
      distributions {
        ancestry_group sex short_allele_repunit long_allele_repunit quality_description q_score
        distribution { short_allele_repunit_count long_allele_repunit_count frequency }
      }
    }
  }
}
`

const Section = styled.section`
  min-width: 0;
  margin-top: 1.5em;

  h3 {
    color: #315d20;
  }
`

const LazyContent = styled.div`
  min-width: 0;
`

type DistributionResponse = {
  status: 'AVAILABLE' | 'NONE' | 'UNAVAILABLE'
  reason_code: string | null
  short_id: string | null
  matched_component_index: number | null
  matched_component: { chrom: string; start0: number; end0: number; motif: string } | null
  main_reference_region: {
    reference_genome: string
    chrom: string
    start: number
    stop: number
  } | null
  reference_repeat_unit: string | null
  distribution_digest: string | null
  allele: ShortReadDistributionPart<V3AlleleSizeDistributionCohort>
  genotype: ShortReadDistributionPart<GenotypeDistributionCohort>
}

const Unavailable = ({ reasonCode }: { reasonCode: string | null }) => (
  <p role="status" data-reason-code={reasonCode || undefined}>
    Short-read reference-cohort distributions are unavailable for this exact context. No
    distribution was inferred or substituted.
  </p>
)

const contentId = 'short-read-reference-distributions-content'

const ShortReadReferenceCohortSection = ({
  locusId,
  lrCohort,
  context,
}: {
  locusId: string
  lrCohort: LongReadCohort
  context: LongReadTrShortReadContext | null
}) => {
  const [requested, setRequested] = useState(false)

  if (context?.status !== 'EXACT_UNIQUE') return null

  const shortId = context.catalog_record?.id
  const motif = context.catalog_record?.reference_repeat_unit
  const expectedComponentIndex = context.matched_component_index
  const expectedComponent = context.matched_component
  const expectedMainRegion = context.catalog_record?.main_reference_region
  const exactContextComplete = Boolean(
    shortId && motif && expectedComponentIndex != null && expectedComponent && expectedMainRegion
  )

  return (
    <Section
      aria-labelledby="short-read-reference-distributions-heading"
      data-assay="short-read"
      data-theme="short-read-green"
    >
      <h3 id="short-read-reference-distributions-heading">
        Short-read reference-cohort distributions
      </h3>
      {exactContextComplete ? (
        <p>
          Green short-read repeat-count plots for the exact matched <strong>{shortId}</strong>{' '}
          <code>{motif}</code> reference repeat unit. These data load separately from the long-read
          data.
        </p>
      ) : (
        <Unavailable reasonCode="EXACT_CONTEXT_INCOMPLETE" />
      )}

      {exactContextComplete && (
        <Button
          type="button"
          aria-controls={contentId}
          aria-disabled={requested}
          aria-expanded={requested}
          onClick={() => {
            if (!requested) setRequested(true)
          }}
        >
          {requested ? 'Short-read distributions requested' : 'Load short-read distributions'}
        </Button>
      )}

      <LazyContent id={contentId}>
        {exactContextComplete && requested && (
          <Query
            operationName={operationName}
            query={longReadTrShortReadDistributionsQuery}
            requestKey={`${lrCohort}:${locusId}`}
            variables={{ id: locusId, lrCohort }}
            loadingMessage="Loading short-read reference-cohort distributions"
            errorMessage="Unable to load short-read reference-cohort distributions"
            success={(data: any) => data.long_read_tandem_repeat_short_read_distributions}
          >
            {({ data }: any) => {
              const distributions =
                data.long_read_tandem_repeat_short_read_distributions as DistributionResponse
              const exactIdentity =
                distributions.status === 'AVAILABLE' &&
                distributions.short_id === shortId &&
                distributions.reference_repeat_unit === motif &&
                distributions.matched_component_index === expectedComponentIndex &&
                distributions.matched_component != null &&
                distributions.matched_component.chrom === expectedComponent!.chrom &&
                distributions.matched_component.start0 === expectedComponent!.start0 &&
                distributions.matched_component.end0 === expectedComponent!.end0 &&
                distributions.matched_component.motif === expectedComponent!.motif &&
                distributions.main_reference_region != null &&
                distributions.main_reference_region.reference_genome ===
                  expectedMainRegion!.reference_genome &&
                distributions.main_reference_region.chrom === expectedMainRegion!.chrom &&
                distributions.main_reference_region.start === expectedMainRegion!.start &&
                distributions.main_reference_region.stop === expectedMainRegion!.stop

              if (!exactIdentity) {
                return <Unavailable reasonCode={distributions.reason_code || 'IDENTITY_MISMATCH'} />
              }

              return (
                <ShortReadStrDistributionPanel
                  key={`${shortId}:${distributions.distribution_digest}`}
                  id={shortId!}
                  motif={motif!}
                  diseases={context.catalog_record!.associated_diseases}
                  allele={distributions.allele}
                  genotype={distributions.genotype}
                  plotHeadingLevel={4}
                />
              )
            }}
          </Query>
        )}
      </LazyContent>
    </Section>
  )
}

export default ShortReadReferenceCohortSection

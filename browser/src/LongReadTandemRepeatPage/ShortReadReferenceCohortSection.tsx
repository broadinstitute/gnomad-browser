import React, { useState } from 'react'
import styled from 'styled-components'

import { Button } from '@gnomad/ui'

import HaplotypeHelpButton from '../Haplotypes/HelpButton'
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
  padding: clamp(1em, 2vw, 1.5em);
  border: 2px solid #73ab3d;
  border-radius: 8px;
  margin: 2em 0;
  background: #f4faef;
`

const SectionHeading = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35em;

  h2 {
    margin: 0;
    color: #315d20;
  }
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

const ShortReadReferenceHelp = () => (
  <HaplotypeHelpButton title="About the short-read reference cohort">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> Green aggregate repeat-count distributions for the exact
      matched repeat unit in the short-read reference cohort.
    </p>
    <div>
      <strong>How to use it.</strong>
      <h4>Short-read allele repeat-count distribution</h4>
      <p>
        Bars count short-read allele copies. Use the independent ancestry, sex, color, scale, and
        catalog-range controls for this green plot.
      </p>
      <h4>Short-read genotype repeat-count distribution</h4>
      <p>
        Squares count people by their shorter and longer repeat counts. Use the independent
        short-read ancestry, sex, and catalog-range controls.
      </p>
      <p>
        Choose <strong>Load short-read distributions</strong> to request these plots.
      </p>
    </div>
    <p style={{ marginBottom: 0 }}>
      <strong>What it does not show.</strong> This separate assay and cohort is not combined with
      the long-read Allelic landscape (shown in purple). Its marks and ranges do not filter, select,
      or classify LR observations.
    </p>
  </HaplotypeHelpButton>
)

const Unavailable = ({ reasonCode }: { reasonCode: string | null }) => (
  <p role="status" data-reason-code={reasonCode || undefined}>
    Short-read reference-cohort distributions are unavailable for this exact context. No
    distribution was inferred or substituted.
  </p>
)

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
  if (
    !shortId ||
    !motif ||
    expectedComponentIndex == null ||
    !expectedComponent ||
    !expectedMainRegion
  ) {
    return (
      <Section aria-labelledby="short-read-reference-cohort-heading">
        <SectionHeading>
          <h2 id="short-read-reference-cohort-heading">Short-read reference cohort unavailable</h2>
          <ShortReadReferenceHelp />
        </SectionHeading>
        <Unavailable reasonCode="EXACT_CONTEXT_INCOMPLETE" />
      </Section>
    )
  }

  return (
    <Section
      aria-labelledby="short-read-reference-cohort-heading"
      data-assay="short-read"
      data-theme="short-read-green"
    >
      <SectionHeading>
        <h2 id="short-read-reference-cohort-heading">
          Short-read reference cohort — {shortId} {motif}
        </h2>
        <ShortReadReferenceHelp />
      </SectionHeading>
      <p>Green short-read repeat-count plots for this exact matched reference repeat unit.</p>

      {!requested ? (
        <Button type="button" onClick={() => setRequested(true)}>
          Load short-read distributions
        </Button>
      ) : (
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
              distributions.matched_component.chrom === expectedComponent.chrom &&
              distributions.matched_component.start0 === expectedComponent.start0 &&
              distributions.matched_component.end0 === expectedComponent.end0 &&
              distributions.matched_component.motif === expectedComponent.motif &&
              distributions.main_reference_region != null &&
              distributions.main_reference_region.reference_genome ===
                expectedMainRegion.reference_genome &&
              distributions.main_reference_region.chrom === expectedMainRegion.chrom &&
              distributions.main_reference_region.start === expectedMainRegion.start &&
              distributions.main_reference_region.stop === expectedMainRegion.stop

            if (!exactIdentity) {
              return <Unavailable reasonCode={distributions.reason_code || 'IDENTITY_MISMATCH'} />
            }

            return (
              <ShortReadStrDistributionPanel
                key={`${shortId}:${distributions.distribution_digest}`}
                id={shortId}
                motif={motif}
                diseases={context.catalog_record!.associated_diseases}
                allele={distributions.allele}
                genotype={distributions.genotype}
              />
            )
          }}
        </Query>
      )}
    </Section>
  )
}

export default ShortReadReferenceCohortSection

import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

import type { AlleleSizeDistributionCohort } from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import type { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
  type GenotypeDistributionCohort,
} from '../LongReadVariantPage/LongReadSTRDistributionSections'

const FULL_TR_DISTRIBUTION_QUERY = `
  query ExpandedTrDistributions($variantId: String!, $lrCohort: LongReadCohort!) {
    long_read_variant(variantId: $variantId, lr_cohort: $lrCohort) {
      variant_id
      motifs
      allele_size_distribution {
        ancestry_group
        sex
        repunit
        distribution {
          repunit_count
          frequency
        }
      }
      max_repunits
      genotype_distribution {
        ancestry_group
        sex
        short_allele_repunit
        long_allele_repunit
        distribution {
          short_allele_repunit_count
          long_allele_repunit_count
          frequency
        }
      }
      main_reference_region {
        chrom
        start
        stop
      }
    }
  }
`

export type ExpandedTrDistributionData = {
  variant_id: string
  motifs: string[] | null
  allele_size_distribution: AlleleSizeDistributionCohort[] | null
  max_repunits: number | null
  genotype_distribution: GenotypeDistributionCohort[] | null
  main_reference_region: { chrom: string; start: number; stop: number } | null
}

const expandedTrDistributionCache = new Map<string, Promise<ExpandedTrDistributionData | null>>()

const cacheKey = (variantId: string, lrCohort: LongReadCohort) => `${lrCohort}:${variantId}`

export const clearExpandedTrDistributionCache = () => expandedTrDistributionCache.clear()

export const fetchExpandedTrDistribution = (
  variantId: string,
  lrCohort: LongReadCohort
): Promise<ExpandedTrDistributionData | null> => {
  const key = cacheKey(variantId, lrCohort)
  const cached = expandedTrDistributionCache.get(key)
  if (cached) return cached

  const responsePromise =
    typeof fetch === 'function'
      ? fetch('/api/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: FULL_TR_DISTRIBUTION_QUERY,
            variables: { variantId, lrCohort },
          }),
        })
      : Promise.reject(new Error('Fetch API unavailable'))

  const request = responsePromise
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      if (payload.errors?.length) {
        throw new Error(
          payload.errors.map((error: { message: string }) => error.message).join(', ')
        )
      }
      return (payload.data?.long_read_variant || null) as ExpandedTrDistributionData | null
    })
    .catch((error) => {
      // Successful and no-data responses stay cached across collapse/re-expand.
      // Failed requests are retryable the next time the row is expanded.
      if (expandedTrDistributionCache.get(key) === request) {
        expandedTrDistributionCache.delete(key)
      }
      throw error
    })

  expandedTrDistributionCache.set(key, request)
  return request
}

const Panel = styled.section`
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid #e0d8bd;
  border-radius: 4px;
  background: #fff;
  white-space: normal;
`

const PlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 20px;

  > div {
    min-width: 0;
  }
`

const Message = styled.p`
  margin: 8px 0 0;
  color: #666;
`

const cohortLabel = (cohort: LongReadCohort) => (cohort === 'aou' ? 'All of Us' : 'HGSVC/HPRC')

const ExpandedTrDistributions = ({
  variantId,
  lrCohort,
}: {
  variantId: string
  lrCohort: LongReadCohort
}) => {
  const [state, setState] = useState<{
    loading: boolean
    data: ExpandedTrDistributionData | null
    error: string | null
  }>({ loading: true, data: null, error: null })

  useEffect(() => {
    let active = true
    setState({ loading: true, data: null, error: null })

    fetchExpandedTrDistribution(variantId, lrCohort).then(
      (data) => {
        if (active) setState({ loading: false, data, error: null })
      },
      () => {
        if (active) {
          setState({
            loading: false,
            data: null,
            error: 'Unable to load the full cohort STR distributions.',
          })
        }
      }
    )

    return () => {
      active = false
    }
  }, [variantId, lrCohort])

  const alleleDistribution = state.data?.allele_size_distribution
  const genotypeDistribution = state.data?.genotype_distribution
  const hasAlleleDistribution = Boolean(
    alleleDistribution && alleleDistribution.length > 0 && state.data?.max_repunits != null
  )
  const hasGenotypeDistribution = Boolean(genotypeDistribution && genotypeDistribution.length > 0)
  const hasFullDistribution = hasAlleleDistribution || hasGenotypeDistribution
  const distributionMotifs = [
    ...(alleleDistribution || []).map((cohort) => cohort.repunit),
    ...(genotypeDistribution || []).flatMap((cohort) => [
      cohort.short_allele_repunit,
      cohort.long_allele_repunit,
    ]),
  ]
    .flatMap((motif) => motif.split(','))
    .map((motif) => motif.trim())
    .filter(Boolean)
  const motifs = state.data?.motifs?.filter(Boolean).length
    ? state.data.motifs.filter(Boolean)
    : [...new Set(distributionMotifs)]
  const repeatUnit = motifs.join(', ')

  return (
    <Panel aria-label="Full cohort STR distributions">
      <h3 style={{ margin: 0 }}>Full cohort STR distributions</h3>
      <Message>
        All called {cohortLabel(lrCohort)} alleles at this locus, loaded when this row was expanded.
        {motifs.length ? ` Repeat motif: ${repeatUnit}.` : ''}
      </Message>
      {state.loading && <Message role="status">Loading full cohort STR distributions…</Message>}
      {state.error && <Message role="alert">{state.error}</Message>}
      {!state.loading && !state.error && !hasFullDistribution && (
        <Message>
          Full cohort STR distributions are unavailable for this cohort and locus. The
          haplotype-only carrier distribution below remains as context.
        </Message>
      )}
      {hasFullDistribution && (
        <PlotGrid>
          {hasAlleleDistribution && (
            <div>
              <LongReadAlleleSizeDistributionSection
                variantId={`${lrCohort}-${variantId}-expanded`}
                alleleSizeDistribution={alleleDistribution!}
                maxRepunits={state.data!.max_repunits!}
                repeatUnit={repeatUnit || undefined}
                headingLevel="h4"
              />
            </div>
          )}
          {hasGenotypeDistribution && (
            <div>
              <LongReadGenotypeDistributionSection
                variantId={`${lrCohort}-${variantId}-expanded`}
                genotypeDistribution={genotypeDistribution!}
                repeatUnit={repeatUnit || undefined}
                headingLevel="h4"
              />
            </div>
          )}
        </PlotGrid>
      )}
    </Panel>
  )
}

export default ExpandedTrDistributions

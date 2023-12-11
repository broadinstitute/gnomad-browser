import queryString from 'query-string'
import React, { useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { Badge, ExternalLink, List, ListItem, Page } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import { TranscriptConsequenceList } from '../VariantPage/TranscriptConsequenceList'

import VariantCooccurrenceDetailsTable from './VariantCooccurrenceDetailsTable'
import VariantCooccurrenceHaplotypeCountsTable from './VariantCooccurrenceHaplotypeCountsTable'
import VariantCooccurrenceSummaryTable from './VariantCooccurrenceSummaryTable'
import VariantCooccurrenceVariantIdsForm from './VariantCooccurrenceVariantIdsForm'

export type GenotypeCounts = {
  ref_ref: number
  ref_het: number
  ref_hom: number
  het_ref: number
  het_het: number
  het_hom: number
  hom_ref: number
  hom_het: number
  hom_hom: number
}

export type HaplotypeCounts = {
  ref_ref: number
  hom_ref: number
  ref_hom: number
  hom_hom: number
}

export type CooccurrenceData = {
  variant_ids: string[]
  genotype_counts: GenotypeCounts
  haplotype_counts: HaplotypeCounts
  p_compound_heterozygous: number | null
  populations: {
    id: string
    genotype_counts: GenotypeCounts
    haplotype_counts: HaplotypeCounts
    p_compound_heterozygous: number | null
  }[]
}

export interface CooccurrenceForPopulation {
  genotype_counts: GenotypeCounts
  haplotype_counts: HaplotypeCounts
  p_compound_heterozygous: number | null
}

export const cisThreshold = 0.02
export const transThreshold = 0.55
const distantCisThreshold = 50000

const Section = styled.section`
  width: 100%;
`

const ResponsiveSection = styled(Section)`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

const renderProbabilityCompoundHeterozygous = (p: any) => {
  if (p === 1) {
    return '100%'
  }
  if (p > 0.99) {
    return '>99%'
  }

  if (p === 0) {
    return '0%'
  }
  if (p < 0.01) {
    return '<1%'
  }

  return `${(p * 100).toFixed(0)}%`
}

type Prediction = 'neither_present' | 'one_not_present' | 'in_cis' | 'in_trans' | 'no_prediction'

const cooccurrenceDescriptions: Record<Prediction, string> = {
  one_not_present: 'One of these variants is not observed in',
  neither_present: 'These variants are not observed',
  in_cis:
    'Based on their co-occurrence pattern in gnomAD, these variants are likely found on the same haplotype in most',
  in_trans:
    'Based on their co-occurrence pattern in gnomAD, these variants are likely found on different haplotypes in most',
  no_prediction:
    'The co-occurrence pattern for these variants doesn’t allow us to give a robust assessment of whether these variants are on the same haplotype or not in',
} as const

const makePrediction = ({
  p_compound_heterozygous,
  genotype_counts,
}: CooccurrenceForPopulation): Prediction => {
  if (p_compound_heterozygous === null) {
    const variantASum =
      genotype_counts.het_ref +
      genotype_counts.het_het +
      genotype_counts.het_hom +
      genotype_counts.hom_ref +
      genotype_counts.hom_het +
      genotype_counts.hom_hom
    const variantAOccurs = variantASum > 0

    const variantBSum =
      genotype_counts.ref_het +
      genotype_counts.ref_hom +
      genotype_counts.het_het +
      genotype_counts.het_hom +
      genotype_counts.hom_het +
      genotype_counts.hom_hom
    const variantBOccurs = variantBSum > 0

    if (!variantAOccurs || !variantBOccurs) {
      if (variantAOccurs || variantBOccurs) {
        return 'one_not_present'
      }
      return 'neither_present'
    }
  }

  if (p_compound_heterozygous! > transThreshold) {
    return 'in_trans'
  }

  if (p_compound_heterozygous! < cisThreshold) {
    return 'in_cis'
  }

  return 'no_prediction'
}

const getCooccurrenceDescription = (prediction: Prediction, selectedPopulation = 'All') => {
  const baseDescription = cooccurrenceDescriptions[prediction]

  return selectedPopulation === 'All'
    ? `${baseDescription} individuals in gnomAD.`
    : `${baseDescription} individuals in the ${
        GNOMAD_POPULATION_NAMES[selectedPopulation as keyof typeof GNOMAD_POPULATION_NAMES]
      } population in gnomAD.`
}

type VariantCoocurrenceProps = {
  cooccurrenceData: CooccurrenceData
}

const isCisSingleton = (genotype_counts: GenotypeCounts): boolean => {
  const totalSum = Object.values(genotype_counts).reduce((a, b) => a + b) - genotype_counts.ref_ref

  return genotype_counts.het_het === 1 && totalSum === 1
}

export const noPredictionPossible = ({
  genotype_counts,
  p_compound_heterozygous,
}: CooccurrenceForPopulation): boolean =>
  p_compound_heterozygous === null || isCisSingleton(genotype_counts)

const variantDistance = ({ variant_ids: [variantId1, variantId2] }: CooccurrenceData): number => {
  const [_chrom1, pos1String] = variantId1.split('-')
  const [_chrom2, pos2String] = variantId2.split('-')
  const pos1 = Number.parseInt(pos1String, 10)
  const pos2 = Number.parseInt(pos2String, 10)
  return Math.abs(pos1 - pos2)
}

const VariantCoocurrence = ({ cooccurrenceData }: VariantCoocurrenceProps) => {
  const [selectedPopulation, setSelectedPopulation] = useState('All')

  const cooccurrenceInSelectedPopulation =
    selectedPopulation === 'All'
      ? cooccurrenceData
      : cooccurrenceData.populations!.find((pop: any) => pop.id === selectedPopulation)!

  const prediction = makePrediction(cooccurrenceInSelectedPopulation)

  const cooccurrenceDescription = getCooccurrenceDescription(prediction, selectedPopulation)
  // If no individual carries both variants, the co-occurrence tables are generated from the public variant data.
  const sharedCarrierExists =
    cooccurrenceData.genotype_counts.het_het +
      cooccurrenceData.genotype_counts.het_hom +
      cooccurrenceData.genotype_counts.hom_het +
      cooccurrenceData.genotype_counts.hom_hom >
    0

  const anyPopulationWithoutPrediction = [cooccurrenceData, ...cooccurrenceData.populations].some(
    noPredictionPossible
  )

  const isDistantCis =
    prediction === 'in_cis' && variantDistance(cooccurrenceData) > distantCisThreshold

  return (
    <>
      <Section style={{ marginBottom: '2em' }}>
        <h2>Overview</h2>
        <VariantCooccurrenceSummaryTable
          cooccurrenceData={cooccurrenceData}
          selectedPopulation={selectedPopulation}
          onSelectPopulation={setSelectedPopulation}
        />

        {sharedCarrierExists && (
          <p>
            <Badge level="info">Note</Badge> Only samples covered at both variant sites are included
            in this table.
          </p>
        )}

        {anyPopulationWithoutPrediction && (
          <p>
            * A likely co-occurrence pattern cannot be calculated in some cases, such as when only
            one of the variants is observed in a genetic ancestry group, or when both variants are
            singletons and were seen in the same individual.
          </p>
        )}

        {isDistantCis && (
          <p>
            Accuracy is lower (&lt; 85%) for variants predicted to be in cis that are &gt; 10
            <sup>5</sup> bp away from each other.
          </p>
        )}
      </Section>

      <h2>
        {selectedPopulation === 'All'
          ? 'Details'
          : // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            `Details for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} Population`}
      </h2>
      <p>
        Select a genetic ancestry group in the overview table to view genotype counts for that
        group.
      </p>
      <Wrapper>
        <ResponsiveSection>
          <h3>Genotype Counts</h3>
          <VariantCooccurrenceDetailsTable
            variantIds={cooccurrenceData.variant_ids}
            genotypeCounts={cooccurrenceInSelectedPopulation.genotype_counts}
          />
          {cooccurrenceDescription && <p>{cooccurrenceDescription}</p>}
          {sharedCarrierExists ? (
            <p>
              <Badge level="info">Note</Badge> Only samples covered at both variant sites are
              included in this table.
            </p>
          ) : (
            <p>
              <Badge level="info">Note</Badge> Because no individual in gnomAD carries both
              variants, this table was computed based on the separate variant information and does
              not account for the possibility that some samples may not be covered at both variant
              sites.
            </p>
          )}
        </ResponsiveSection>

        {!isCisSingleton(cooccurrenceData.genotype_counts) && (
          <ResponsiveSection>
            <h3>
              {cooccurrenceInSelectedPopulation.genotype_counts.het_het > 0 && <>Estimated </>}
              Haplotype Counts
            </h3>
            <VariantCooccurrenceHaplotypeCountsTable
              variantIds={cooccurrenceData.variant_ids}
              haplotypeCounts={cooccurrenceInSelectedPopulation.haplotype_counts}
            />
            {cooccurrenceInSelectedPopulation.p_compound_heterozygous !== null && (
              <>
                <p>
                  The estimated probability that these variants occur in different haplotypes is{' '}
                  {renderProbabilityCompoundHeterozygous(
                    cooccurrenceInSelectedPopulation.p_compound_heterozygous
                  )}
                  .
                </p>
                <p>
                  <Badge level="warning">Note</Badge> Probability values are not well calibrated,
                  particularly where both variants are extremely rare. Interpret with caution.
                  Please see{' '}
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-07-variant-co-occurrence-phasing-information-in-gnomad/">
                    our blog post on variant co-occurrence
                  </ExternalLink>{' '}
                  for accuracy estimates and additional detail.
                </p>
              </>
            )}
          </ResponsiveSection>
        )}
      </Wrapper>
    </>
  )
}

const operationName = 'VariantCooccurrence'
const query = `
query ${operationName}($variants: [String!]!, $variant1: String!, $variant2: String, $datasetId: DatasetId!) {
  variant_cooccurrence(variants: $variants, dataset: $datasetId) {
    variant_ids
    genotype_counts
    haplotype_counts
    p_compound_heterozygous
    populations {
      id
      genotype_counts
      haplotype_counts
      p_compound_heterozygous
    }
  }
  variant1: variant(variantId: $variant1, dataset: $datasetId) {
    exome {
      ac
      an
    }
    genome {
      ac
      an
    }
    multi_nucleotide_variants {
      combined_variant_id
      other_constituent_snvs
    }
    transcript_consequences {
      gene_id
      gene_version
      gene_symbol
      hgvs
      hgvsc
      hgvsp
      is_canonical
      is_mane_select
      is_mane_select_version
      lof
      lof_flags
      lof_filter
      major_consequence
      polyphen_prediction
      sift_prediction
      transcript_id
      transcript_version
    }
  }
  variant2: variant(variantId: $variant2, dataset: $datasetId) {
    exome {
      ac
      an
    }
    genome {
      ac
      an
    }
    multi_nucleotide_variants {
      combined_variant_id
      other_constituent_snvs
    }
    transcript_consequences {
      gene_id
      gene_version
      gene_symbol
      hgvs
      hgvsc
      hgvsp
      is_canonical
      is_mane_select
      is_mane_select_version
      lof
      lof_flags
      lof_filter
      major_consequence
      polyphen_prediction
      sift_prediction
      transcript_id
      transcript_version
    }
  }
}
`

type VariantCoocurrenceContainerProps = {
  datasetId: string
  variantIds: string[]
}

interface ArrayCountPopulation {
  genotype_counts: number[]
  haplotype_counts: number[]
}

interface ObjectCountPopulation {
  genotype_counts: GenotypeCounts
  haplotype_counts: HaplotypeCounts
}

const structureCounts = (population: ArrayCountPopulation): ObjectCountPopulation => {
  const { genotype_counts, haplotype_counts } = population
  const structuredGenotypeCounts: GenotypeCounts = {
    ref_ref: genotype_counts[0],
    ref_het: genotype_counts[1],
    ref_hom: genotype_counts[2],
    het_ref: genotype_counts[3],
    het_het: genotype_counts[4],
    het_hom: genotype_counts[5],
    hom_ref: genotype_counts[6],
    hom_het: genotype_counts[7],
    hom_hom: genotype_counts[8],
  }
  const structuredHaplotypeCounts: HaplotypeCounts = {
    ref_ref: haplotype_counts[0],
    hom_ref: haplotype_counts[1],
    ref_hom: haplotype_counts[2],
    hom_hom: haplotype_counts[3],
  }

  return {
    ...population,
    genotype_counts: structuredGenotypeCounts,
    haplotype_counts: structuredHaplotypeCounts,
  }
}

const normalizeCooccurrenceData = (cooccurrenceData: any): CooccurrenceData => {
  const populations = cooccurrenceData.populations
    ? cooccurrenceData.populations.map(structureCounts)
    : cooccurrenceData.populations

  const topLevel = structureCounts(cooccurrenceData)
  return { ...topLevel, populations } as CooccurrenceData
}

const VariantCoocurrenceContainer = ({
  datasetId,
  variantIds,
}: VariantCoocurrenceContainerProps) => {
  return (
    <Query
      errorMessage="Unable to load co-occurrence"
      loadingMessage="Loading co-occurrence"
      operationName={operationName}
      query={query}
      variables={{
        variants: variantIds,
        variant1: variantIds[0],
        variant2: variantIds[1],
        datasetId,
      }}
      success={(data: any) => data.variant_cooccurrence}
    >
      {({ data }: any) => {
        const variant_cooccurrence = normalizeCooccurrenceData(data.variant_cooccurrence)

        const genesInCommon = [data.variant1, data.variant2]
          .map((v) => new Set(v.transcript_consequences.map((csq: any) => csq.gene_id)))
          .reduce((acc, genes) => new Set([...acc].filter((geneId) => genes.has(geneId))))

        // @ts-expect-error TS(7006) FIXME: Parameter 'acc' implicitly has an 'any' type.
        const geneSymbols = data.variant1.transcript_consequences.reduce((acc, csq) => ({
          ...acc,
          [csq.gene_id]: csq.gene_symbol,
        }))

        const multiNucleotideVariants = (
          (data.variant1 || {}).multi_nucleotide_variants || []
        ).filter((mnv: any) => mnv.other_constituent_snvs.includes(variantIds[1]))

        return (
          <>
            {multiNucleotideVariants.length > 0 && (
              <Section>
                <h2>Multi-nucleotide Variants</h2>
                <p>
                  These variants are found in-phase in some individuals as{' '}
                  {multiNucleotideVariants.length === 1
                    ? 'a multi-nucleotide variant'
                    : 'multi-nucleotide variants'}
                  .
                </p>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <List>
                  {multiNucleotideVariants.map((mnv: any) => (
                    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                    <ListItem key={mnv.combined_variant_id}>
                      <Link to={`/variant/${mnv.combined_variant_id}`}>
                        {mnv.combined_variant_id}
                      </Link>
                    </ListItem>
                  ))}
                </List>
              </Section>
            )}

            <VariantCoocurrence cooccurrenceData={variant_cooccurrence} />

            <Section>
              <h2>VEP Annotations</h2>
              <p>
                These variants both occur in {genesInCommon.size} gene
                {genesInCommon.size === 1 ? '' : 's'}:{' '}
                {Array.from(genesInCommon)
                  .map((geneId: any) => (
                    <Link key={geneId} to={`/gene/${geneId}`}>
                      {geneSymbols[geneId]}
                    </Link>
                  ))
                  .flatMap((el: any) => [', ', el])
                  .slice(1)}
                . Only annotations for {genesInCommon.size === 1 ? 'this gene' : 'these genes'} are
                shown here.
              </p>
              <Wrapper>
                <ResponsiveSection>
                  <h3>
                    <Link to={`/variant/${variantIds[0]}`}>{variantIds[0]}</Link>
                  </h3>
                  <TranscriptConsequenceList
                    transcriptConsequences={data.variant1.transcript_consequences.filter(
                      (csq: any) => genesInCommon.has(csq.gene_id)
                    )}
                  />
                </ResponsiveSection>

                <ResponsiveSection>
                  <h3>
                    <Link to={`/variant/${variantIds[1]}`}>{variantIds[1]}</Link>
                  </h3>
                  <TranscriptConsequenceList
                    transcriptConsequences={data.variant2.transcript_consequences.filter(
                      (csq: any) => genesInCommon.has(csq.gene_id)
                    )}
                  />
                </ResponsiveSection>
              </Wrapper>
            </Section>
          </>
        )
      }}
    </Query>
  )
}

type VariantCoocurrencePageProps = {
  datasetId: DatasetId
}

const VariantCoocurrencePage = ({ datasetId }: VariantCoocurrencePageProps) => {
  const history = useHistory()
  const location = useLocation()

  let { variant: variantIds } = queryString.parse(location.search)
  if (variantIds === undefined) {
    variantIds = []
  } else if (typeof variantIds === 'string') {
    variantIds = [variantIds]
  }

  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title="Variant Co-occurrence" />
      <GnomadPageHeading
        datasetOptions={{
          // Co-occurrence data only available for gnomAD v2
          includeExac: false,
          includeGnomad2: true,
          includeGnomad2Subsets: false,
          includeGnomad3: false,
          includeStructuralVariants: false,
        }}
        selectedDataset={datasetId}
      >
        Variant Co-Occurrence
      </GnomadPageHeading>
      {datasetId === 'gnomad_r2_1' ? (
        <>
          <p>
            For more information about co-occurrence data and how to use this tool, see our{' '}
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-07-variant-co-occurrence-phasing-information-in-gnomad/">
              &ldquo;Variant Co-Occurrence (Phasing) Information in gnomAD&rdquo; blog post
            </ExternalLink>
            .
          </p>
          <Section style={{ marginBottom: '2em' }}>
            <h2>Select a variant pair</h2>
            <p>Co-occurrence is available for coding and UTR variants that:</p>
            {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
            <List>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>Occur in the same gene</ListItem>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>Appear in gnomAD exome samples</ListItem>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>Have a global allele frequency &le; 5%</ListItem>
            </List>

            <VariantCooccurrenceVariantIdsForm
              datasetId={datasetId}
              defaultValues={variantIds}
              onSubmit={(newVariantIds: any) => {
                history.push({
                  ...location,
                  search: queryString.stringify({
                    variant: newVariantIds,
                    dataset: datasetId,
                  }),
                })
              }}
            />
          </Section>

          {/* @ts-expect-error TS(2531) FIXME: Object is possibly 'null'. */}
          {variantIds.length === 2 && (
            // @ts-expect-error TS(2322) FIXME: Type '(string | null)[] | null' is not assignable ... Remove this comment to see the full error message
            <VariantCoocurrenceContainer datasetId={datasetId} variantIds={variantIds} />
          )}
        </>
      ) : (
        <StatusMessage>
          Variant co-occurrence is only available for gnomAD v2.1.1
          <br />
          <br />
          <Link to={`${location.pathname}?dataset=gnomad_r2_1`} preserveSelectedDataset={false}>
            View variant co-occurrence in gnomAD v2.1.1
          </Link>
        </StatusMessage>
      )}
    </Page>
  )
}

export default VariantCoocurrencePage

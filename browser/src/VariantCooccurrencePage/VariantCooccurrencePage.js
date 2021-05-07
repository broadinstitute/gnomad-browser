import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

import { isVariantId } from '@gnomad/identifiers'
import { Input, List, ListItem, Page, PrimaryButton } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import Delayed from '../Delayed'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import { BaseQuery } from '../Query'
import StatusMessage from '../StatusMessage'
import { TranscriptConsequenceList } from '../VariantPage/TranscriptConsequenceList'
import { getConsequenceRank } from '../vepConsequences'

import CooccurrenceDataPropType from './CooccurrenceDataPropType'
import VariantCooccurrenceDetailsTable from './VariantCooccurrenceDetailsTable'
import VariantCooccurrenceSummaryTable from './VariantCooccurrenceSummaryTable'

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

const VariantCoocurrence = ({ cooccurrenceData }) => {
  const [selectedPopulation, setSelectedPopulation] = useState('All')

  const cooccurrenceInSelectedPopulation =
    selectedPopulation === 'All'
      ? cooccurrenceData
      : cooccurrenceData.populations.find(pop => pop.id === selectedPopulation)

  let cooccurrenceDescription
  if (cooccurrenceInSelectedPopulation.p_compound_heterozygous === null) {
    cooccurrenceDescription =
      'The co-occurence pattern for these variants doesn’t allow us to give a robust assessment of whether these variants are on the same haplotype or not in'
  } else if (cooccurrenceInSelectedPopulation.p_compound_heterozygous > 0.505) {
    cooccurrenceDescription =
      'Based on their co-occurence pattern in gnomAD, these variants are likely found on different haplotypes in most'
  } else if (cooccurrenceInSelectedPopulation.p_compound_heterozygous < 0.164) {
    cooccurrenceDescription =
      'Based on their co-occurence pattern in gnomAD, these variants are likely found on the same haplotype in most'
  } else {
    cooccurrenceDescription =
      'The co-occurence pattern for these variants doesn’t allow us to give a robust assessment of whether these variants are on the same haplotype or not in'
  }

  if (selectedPopulation === 'All') {
    cooccurrenceDescription = `${cooccurrenceDescription} individuals in gnomAD`
  } else {
    cooccurrenceDescription = `${cooccurrenceDescription} individuals in the ${GNOMAD_POPULATION_NAMES[selectedPopulation]} population in gnomAD`
  }

  return (
    <Wrapper>
      <ResponsiveSection>
        <h2>Overview</h2>
        <VariantCooccurrenceSummaryTable
          cooccurrenceData={cooccurrenceData}
          selectedPopulation={selectedPopulation}
          onSelectPopulation={setSelectedPopulation}
        />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>
          {selectedPopulation === 'All'
            ? 'Details'
            : `Details for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} Population`}
        </h2>
        <VariantCooccurrenceDetailsTable
          variantIds={cooccurrenceData.variant_ids}
          genotypeCounts={cooccurrenceInSelectedPopulation.genotype_counts}
        />
        <p>{cooccurrenceDescription}.</p>
      </ResponsiveSection>
    </Wrapper>
  )
}

VariantCoocurrence.propTypes = {
  cooccurrenceData: CooccurrenceDataPropType.isRequired,
}

const InputGroup = styled.div`
  margin-bottom: 1em;
`

const FormValidationMessage = styled.span`
  display: inline-block;
  margin-top: 0.5em;
  color: #ff583f;
`

const SubmitButton = styled(PrimaryButton).attrs({ type: 'submit' })``

const VariantCoocurrenceForm = ({ onSubmit }) => {
  const [variant1Id, setVariant1Id] = useState('')
  const [variant2Id, setVariant2Id] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setSubmitted(false)
  }, [variant1Id, variant2Id])

  let variant1ValidationError = null
  if (variant1Id) {
    if (!isVariantId(variant1Id)) {
      variant1ValidationError =
        'Variants must be specified as chromosome-position-reference-alternate'
    } else if (variant2Id && variant1Id === variant2Id) {
      variant1ValidationError = 'Two different variants must be provided'
    }
  }
  const isVariant1Invalid = Boolean(variant1ValidationError)

  let variant2ValidationError = null
  if (variant2Id) {
    if (!isVariantId(variant2Id)) {
      variant2ValidationError =
        'Variants must be specified as chromosome-position-reference-alternate'
    } else if (variant1Id && variant2Id === variant1Id) {
      variant2ValidationError = 'Two different variants must be provided'
    }
  }
  const isVariant2Invalid = Boolean(variant2ValidationError)

  return (
    <form
      onSubmit={e => {
        e.preventDefault()

        setSubmitted(true)
        onSubmit([variant1Id, variant2Id])
      }}
    >
      <InputGroup>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="cooccurrence-variant1" style={{ display: 'block' }}>
          Variant 1 (required)
          <Input
            aria-describedby={isVariant1Invalid ? 'cooccurrence-variant1-error' : undefined}
            id="cooccurrence-variant1"
            placeholder="chromosome-position-reference-alternate"
            required
            value={variant1Id}
            onChange={e => {
              setVariant1Id(e.target.value)
            }}
          />
        </label>
        {isVariant1Invalid && (
          <FormValidationMessage id="cooccurrence-variant1-error">
            {variant1ValidationError}
          </FormValidationMessage>
        )}
      </InputGroup>
      <InputGroup>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="cooccurrence-variant2" style={{ display: 'block' }}>
          Variant 2 (required)
          <Input
            aria-describedby={isVariant2Invalid ? 'cooccurrence-variant2-error' : undefined}
            id="cooccurrence-variant2"
            placeholder="chromosome-position-reference-alternate"
            required
            value={variant2Id}
            onChange={e => {
              setVariant2Id(e.target.value)
            }}
          />
        </label>
        {isVariant2Invalid && (
          <FormValidationMessage id="cooccurrence-variant2-error">
            {variant2ValidationError}
          </FormValidationMessage>
        )}
      </InputGroup>

      <SubmitButton
        disabled={!variant1Id || !variant2Id || isVariant1Invalid || isVariant2Invalid || submitted}
      >
        Submit
      </SubmitButton>
    </form>
  )
}

VariantCoocurrenceForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
}

const query = `
query VariantCooccurrence($variants: [String!]!, $variant1: String!, $variant2: String, $datasetId: DatasetId!) {
  variant_cooccurrence(variants: $variants, dataset: $datasetId) {
    variant_ids
    genotype_counts
    p_compound_heterozygous
    populations {
      id
      genotype_counts
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

const VariantCoocurrenceContainer = ({ datasetId }) => {
  const [variantIds, setVariantIds] = useState(null)

  return (
    <>
      <Section>
        <h2>Select a variant pair</h2>
        <p>Co-occurrence is available for coding and UTR variants that:</p>
        <List>
          <ListItem>Occur in the same gene</ListItem>
          <ListItem>Have a global allele frequency &le; 5%</ListItem>
        </List>

        <VariantCoocurrenceForm onSubmit={setVariantIds} />
      </Section>
      {variantIds && (
        <BaseQuery
          query={query}
          variables={{
            variants: variantIds,
            variant1: variantIds[0],
            variant2: variantIds[1],
            datasetId,
          }}
        >
          {({ data, error, loading }) => {
            if (loading) {
              return (
                <Delayed>
                  <StatusMessage>Loading co-occurrence...</StatusMessage>
                </Delayed>
              )
            }

            if (error || !data) {
              return <StatusMessage>Unable to load co-occurrence</StatusMessage>
            }

            if (!data.variant1) {
              return <StatusMessage>{variantIds[0]} is not found in gnomAD</StatusMessage>
            }

            if (!data.variant2) {
              return <StatusMessage>{variantIds[1]} is not found in gnomAD</StatusMessage>
            }

            const variant1Genes = new Set(
              data.variant1.transcript_consequences.map(csq => csq.gene_id)
            )
            const variant2Genes = new Set(
              data.variant2.transcript_consequences.map(csq => csq.gene_id)
            )

            const genesInCommon = Array.from(
              new Set([...variant1Genes].filter(geneId => variant2Genes.has(geneId)))
            )

            const variant1TranscriptConsequences = data.variant1.transcript_consequences
            const variant2TranscriptConsequences = data.variant2.transcript_consequences

            if (!data.variant_cooccurrence) {
              let reasonForNoData = null

              // Do we expect to have cooccurrence data for this pair of variants?
              if (genesInCommon.length === 0) {
                reasonForNoData =
                  'Variant co-occurrence is only available for variants that occur in the same gene.'
              } else if (
                !genesInCommon.some(geneId => {
                  const variant1MostSevereConsequenceRank = Math.min(
                    ...variant1TranscriptConsequences
                      .filter(csq => csq.gene_id === geneId)
                      .map(csq => getConsequenceRank(csq.major_consequence))
                  )
                  const variant2MostSevereConsequenceRank = Math.min(
                    ...variant2TranscriptConsequences
                      .filter(csq => csq.gene_id === geneId)
                      .map(csq => getConsequenceRank(csq.major_consequence))
                  )
                  return (
                    variant1MostSevereConsequenceRank <=
                      getConsequenceRank('3_prime_UTR_variant') &&
                    variant2MostSevereConsequenceRank <= getConsequenceRank('3_prime_UTR_variant')
                  )
                })
              ) {
                reasonForNoData =
                  'Variant co-occurrence is only available for coding or UTR variants that occur in the same gene.'
              } else {
                const variant1AF =
                  (((data.variant1.exome || {}).ac || 0) + ((data.variant1.genome || {}).ac || 0)) /
                  (((data.variant1.exome || {}).an || 0) + ((data.variant1.genome || {}).an || 0) ||
                    1)

                const variant2AF =
                  (((data.variant2.exome || {}).ac || 0) + ((data.variant2.genome || {}).ac || 0)) /
                  (((data.variant2.exome || {}).an || 0) + ((data.variant2.genome || {}).an || 0) ||
                    1)

                if (variant1AF > 0.05 || variant2AF > 0.05) {
                  reasonForNoData =
                    'Variant co-occurrence is only available for variants with a global allele frequency ≤ 5%.'
                }
              }

              if (!reasonForNoData) {
                reasonForNoData = 'There are no carriers of both variants in gnomAD.'
              }

              return <p>{reasonForNoData}</p>
            }

            const geneSymbols = variant1TranscriptConsequences.reduce((acc, csq) => ({
              ...acc,
              [csq.gene_id]: csq.gene_symbol,
            }))

            return (
              <>
                <VariantCoocurrence cooccurrenceData={data.variant_cooccurrence} />
                <Section>
                  <h2>VEP Annotations</h2>
                  <p>
                    These variants both occur in {genesInCommon.length} gene
                    {genesInCommon.length === 1 ? '' : 's'}:{' '}
                    {Array.from(new Set(variant1TranscriptConsequences.map(csq => csq.gene_id)))
                      .map(geneId => (
                        <Link key={geneId} to={`/gene/${geneId}`}>
                          {geneSymbols[geneId]}
                        </Link>
                      ))
                      .flatMap(el => [', ', el])
                      .slice(1)}
                    . Only annotations for{' '}
                    {genesInCommon.length === 1 ? 'this gene' : 'these genes'} are shown here.
                  </p>
                  <Wrapper>
                    <ResponsiveSection>
                      <h3>{variantIds[0]}</h3>
                      <TranscriptConsequenceList
                        transcriptConsequences={data.variant1.transcript_consequences.filter(csq =>
                          genesInCommon.has(csq.gene_id)
                        )}
                      />
                    </ResponsiveSection>

                    <ResponsiveSection>
                      <h3>{variantIds[1]}</h3>
                      <TranscriptConsequenceList
                        transcriptConsequences={data.variant2.transcript_consequences.filter(csq =>
                          genesInCommon.has(csq.gene_id)
                        )}
                      />
                    </ResponsiveSection>
                  </Wrapper>
                </Section>
              </>
            )
          }}
        </BaseQuery>
      )}
    </>
  )
}

VariantCoocurrenceContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
}

const VariantCoocurrencePage = ({ datasetId }) => {
  return (
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
        <VariantCoocurrenceContainer datasetId={datasetId} />
      ) : (
        <StatusMessage>Variant co-occurrence is only available for gnomAD v2.</StatusMessage>
      )}
    </Page>
  )
}

VariantCoocurrencePage.propTypes = {
  datasetId: PropTypes.string.isRequired,
}

export default VariantCoocurrencePage

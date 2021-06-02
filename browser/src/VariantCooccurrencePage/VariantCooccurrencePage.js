import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled from 'styled-components'

import { isVariantId } from '@gnomad/identifiers'
import { Badge, Input, List, ListItem, Page, PrimaryButton } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { referenceGenomeForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import { TranscriptConsequenceList } from '../VariantPage/TranscriptConsequenceList'

import CooccurrenceDataPropType from './CooccurrenceDataPropType'
import VariantCooccurrenceDetailsTable from './VariantCooccurrenceDetailsTable'
import VariantCooccurrenceHaplotypeCountsTable from './VariantCooccurrenceHaplotypeCountsTable'
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

const renderProbabilityCompoundHeterozygous = p => {
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
    <>
      <Section>
        <h2>Overview</h2>
        <VariantCooccurrenceSummaryTable
          cooccurrenceData={cooccurrenceData}
          selectedPopulation={selectedPopulation}
          onSelectPopulation={setSelectedPopulation}
        />
      </Section>

      <h2>
        {selectedPopulation === 'All'
          ? 'Details'
          : `Details for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} Population`}
      </h2>
      <Wrapper>
        <ResponsiveSection>
          <h3>Genotype Counts</h3>
          <VariantCooccurrenceDetailsTable
            variantIds={cooccurrenceData.variant_ids}
            genotypeCounts={cooccurrenceInSelectedPopulation.genotype_counts}
          />
          <p>{cooccurrenceDescription}.</p>
        </ResponsiveSection>

        {cooccurrenceInSelectedPopulation.p_compound_heterozygous !== null && (
          <ResponsiveSection>
            <h3>Estimated Haplotype Counts</h3>
            <VariantCooccurrenceHaplotypeCountsTable
              variantIds={cooccurrenceData.variant_ids}
              haplotypeCounts={cooccurrenceInSelectedPopulation.haplotype_counts}
            />
            <p>
              The estimated probability that these variants occur in different haplotypes is{' '}
              {renderProbabilityCompoundHeterozygous(
                cooccurrenceInSelectedPopulation.p_compound_heterozygous
              )}
              .
            </p>
            <p>
              <Badge level="warning">Note</Badge> Probability values are not well calibrated.
              Interpret with caution.
            </p>
          </ResponsiveSection>
        )}
      </Wrapper>
    </>
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

const VariantCoocurrenceForm = ({ datasetId, onSubmit }) => {
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
            placeholder={`chromosome-position-reference-alternate (${referenceGenomeForDataset(
              datasetId
            )})`}
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
            placeholder={`chromosome-position-reference-alternate (${referenceGenomeForDataset(
              datasetId
            )})`}
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
  datasetId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

const query = `
query VariantCooccurrence($variants: [String!]!, $variant1: String!, $variant2: String, $datasetId: DatasetId!) {
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
          <ListItem>Appear in gnomAD exome samples</ListItem>
          <ListItem>Have a global allele frequency &le; 5%</ListItem>
        </List>

        <VariantCoocurrenceForm datasetId={datasetId} onSubmit={setVariantIds} />
      </Section>
      {variantIds && (
        <Query
          errorMessage="Unable to load co-occurrence"
          loadingMessage="Loading co-occurrence"
          query={query}
          variables={{
            variants: variantIds,
            variant1: variantIds[0],
            variant2: variantIds[1],
            datasetId,
          }}
          success={data => data.variant_cooccurrence}
        >
          {({ data }) => {
            const genesInCommon = [data.variant1, data.variant2]
              .map(v => new Set(v.transcript_consequences.map(csq => csq.gene_id)))
              .reduce((acc, genes) => new Set([...acc].filter(geneId => genes.has(geneId))))

            const geneSymbols = data.variant1.transcript_consequences.reduce((acc, csq) => ({
              ...acc,
              [csq.gene_id]: csq.gene_symbol,
            }))

            return (
              <>
                <VariantCoocurrence cooccurrenceData={data.variant_cooccurrence} />
                <Section>
                  <h2>VEP Annotations</h2>
                  <p>
                    These variants both occur in {genesInCommon.size} gene
                    {genesInCommon.size === 1 ? '' : 's'}:{' '}
                    {Array.from(genesInCommon)
                      .map(geneId => (
                        <Link key={geneId} to={`/gene/${geneId}`}>
                          {geneSymbols[geneId]}
                        </Link>
                      ))
                      .flatMap(el => [', ', el])
                      .slice(1)}
                    . Only annotations for {genesInCommon.size === 1 ? 'this gene' : 'these genes'}{' '}
                    are shown here.
                  </p>
                  <Wrapper>
                    <ResponsiveSection>
                      <h3>
                        <Link to={`/variant/${variantIds[0]}`}>{variantIds[0]}</Link>
                      </h3>
                      <TranscriptConsequenceList
                        transcriptConsequences={data.variant1.transcript_consequences.filter(csq =>
                          genesInCommon.has(csq.gene_id)
                        )}
                      />
                    </ResponsiveSection>

                    <ResponsiveSection>
                      <h3>
                        <Link to={`/variant/${variantIds[1]}`}>{variantIds[1]}</Link>
                      </h3>
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
        </Query>
      )}
    </>
  )
}

VariantCoocurrenceContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
}

const VariantCoocurrencePage = ({ datasetId }) => {
  const location = useLocation()
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

VariantCoocurrencePage.propTypes = {
  datasetId: PropTypes.string.isRequired,
}

export default VariantCoocurrencePage

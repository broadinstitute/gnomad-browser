import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Page } from '@broad/ui'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import VariantFeedback from '../VariantPage/VariantFeedback'
import MultiallelicCopyNumberVariantPlot from './MultiallelicCopyNumberVariantPlot'
import StructuralVariantAttributeList from './StructuralVariantAttributeList'
import StructuralVariantConsequenceList from './StructuralVariantConsequenceList'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'
import StructuralVariantPopulationsTable from './StructuralVariantPopulationsTable'
import SVReferenceList from './SVReferenceList'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

const ResponsiveSection = styled.section`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const StructuralVariantPage = ({ datasetId, variant }) => (
  <Page>
    <DocumentTitle title={variant.variant_id} />
    <GnomadPageHeading datasetOptions={{ includeShortVariants: false }} selectedDataset={datasetId}>
      Structural variant: {variant.variant_id}
    </GnomadPageHeading>
    <Wrapper>
      <ResponsiveSection>
        <StructuralVariantAttributeList variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>References</h2>
        <SVReferenceList variant={variant} />
        <h2>Report</h2>
        <VariantFeedback datasetId={datasetId} variantId={variant.variant_id} />
      </ResponsiveSection>
    </Wrapper>
    {variant.type === 'MCNV' && (
      <Wrapper>
        <ResponsiveSection>
          <h2>Copy Number Distribution</h2>
          <MultiallelicCopyNumberVariantPlot variant={variant} />
        </ResponsiveSection>
      </Wrapper>
    )}
    <Wrapper>
      <ResponsiveSection>
        <h2>Consequences</h2>
        <p>
          This variant has consequences in {variant.genes.length} gene
          {variant.genes.length !== 1 && 's'}.
        </p>
        <StructuralVariantConsequenceList variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Population Frequencies</h2>
        <StructuralVariantPopulationsTable variant={variant} />
      </ResponsiveSection>
    </Wrapper>
  </Page>
)

StructuralVariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: StructuralVariantDetailPropType.isRequired,
}

const ConnectedStructuralVariantPage = ({ datasetId, variantId, ...rest }) => {
  const query = `
    query StructuralVariant($datasetId: StructuralVariantDatasetId!, $variantId: String!) {
      structural_variant(dataset: $datasetId, variantId: $variantId) {
        algorithms
        alts
        ac
        an
        chrom
        chrom2
        consequences {
          consequence
          genes
        }
        copy_numbers {
          copy_number
          ac
        }
        cpx_intervals
        cpx_type
        end
        end2
        evidence
        filters
        genes
        length
        populations {
          id
          ac
          an
          ac_hom
        }
        pos
        pos2
        qual
        type
        variant_id
      }
    }
  `

  return (
    <Query query={query} variables={{ datasetId, variantId }}>
      {({ data, error, graphQLErrors, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variant...</StatusMessage>
        }

        if (error || !data) {
          return <StatusMessage>Unable to load variant</StatusMessage>
        }

        if (!data.structural_variant) {
          return (
            <StatusMessage>
              {graphQLErrors
                ? graphQLErrors.map(e => e.message).join(', ')
                : 'Unable to load variant'}
            </StatusMessage>
          )
        }

        return (
          <StructuralVariantPage
            {...rest}
            datasetId={datasetId}
            variant={data.structural_variant}
          />
        )
      }}
    </Query>
  )
}

ConnectedStructuralVariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default ConnectedStructuralVariantPage

import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Page, SectionHeading } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import { Query } from '../Query'
import StatusMessage from '../StatusMessage'
import MultiallelicCopyNumberVariantPlot from './MultiallelicCopyNumberVariantPlot'
import StructuralVariantAttributeList from './StructuralVariantAttributeList'
import StructuralVariantConsequenceList from './StructuralVariantConsequenceList'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'
import StructuralVariantPopulationsTable from './StructuralVariantPopulationsTable'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  margin-bottom: 2em;
`

const ResponsiveSection = styled.section`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const StructuralVariantPage = ({ datasetId, variant }) => (
  <Page>
    <GnomadPageHeading datasetOptions={{ includeShortVariants: false }} selectedDataset={datasetId}>
      {variant.variant_id}
    </GnomadPageHeading>
    <Wrapper>
      {variant.type === 'MCNV' ? (
        <React.Fragment>
          <ResponsiveSection>
            <StructuralVariantAttributeList variant={variant} />
          </ResponsiveSection>
          <ResponsiveSection>
            <MultiallelicCopyNumberVariantPlot variant={variant} />
          </ResponsiveSection>
        </React.Fragment>
      ) : (
        <StructuralVariantAttributeList variant={variant} />
      )}
    </Wrapper>
    <Wrapper>
      <ResponsiveSection>
        <SectionHeading>Consequences</SectionHeading>
        <p>
          This variant has consequences in {variant.genes.length} gene
          {variant.genes.length !== 1 && 's'}.
        </p>
        <StructuralVariantConsequenceList variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <SectionHeading>Population Frequencies</SectionHeading>
        <StructuralVariantPopulationsTable variant={variant} />
      </ResponsiveSection>
    </Wrapper>
  </Page>
)

StructuralVariantPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: StructuralVariantDetailPropType.isRequired,
}

const ConnectedStructruralVariantPage = ({ variantId, ...rest }) => {
  const query = `
    query StructuralVariant($variantId: String!) {
      structural_variant(variantId: $variantId) {
        algorithms
        alts
        ac
        an
        chrom
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
        end_chrom
        end_pos
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
        qual
        type
        variant_id
      }
    }
  `

  return (
    <Query query={query} variables={{ variantId }}>
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variant...</StatusMessage>
        }

        if (error || !data.structural_variant) {
          return <StatusMessage>Failed to load variant</StatusMessage>
        }

        return <StructuralVariantPage {...rest} variant={data.structural_variant} />
      }}
    </Query>
  )
}

export default ConnectedStructruralVariantPage

import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Page } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'
import VariantFeedback from '../VariantPage/VariantFeedback'
import MultiallelicCopyNumberVariantPlot from './MultiallelicCopyNumberVariantPlot'
import StructuralVariantAgeDistribution from './StructuralVariantAgeDistribution'
import StructuralVariantAttributeList from './StructuralVariantAttributeList'
import StructuralVariantConsequenceList from './StructuralVariantConsequenceList'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'
import StructuralVariantGenotypeQualityMetrics from './StructuralVariantGenotypeQualityMetrics'
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
    <DocumentTitle title={`${variant.variant_id} | ${labelForDataset(datasetId)}`} />
    <GnomadPageHeading datasetOptions={{ includeShortVariants: false }} selectedDataset={datasetId}>
      Structural variant: {variant.variant_id}
    </GnomadPageHeading>
    <Wrapper>
      <ResponsiveSection>
        <StructuralVariantAttributeList variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>External Resources</h2>
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
        <h2>Genotype Quality</h2>
        {variant.genotype_quality ? (
          <StructuralVariantGenotypeQualityMetrics variant={variant} />
        ) : (
          <p>Genotype quality is available for this variant.</p>
        )}
      </ResponsiveSection>
    </Wrapper>
    <Wrapper>
      <ResponsiveSection>
        <h2>Population Frequencies</h2>
        <StructuralVariantPopulationsTable variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Age Distribution</h2>
        {variant.age_distribution ? (
          <React.Fragment>
            {datasetId !== 'gnomad_sv_r2_1' && (
              <p>Age distribution is based on the full SV dataset, not the selected subset.</p>
            )}
            <StructuralVariantAgeDistribution variant={variant} />
          </React.Fragment>
        ) : (
          <p>Age data is not available for this variant.</p>
        )}
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
        age_distribution {
          het {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
          hom {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
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
        genotype_quality {
          all {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
          alt {
            bin_edges
            bin_freq
            n_smaller
            n_larger
          }
        }
        length
        populations {
          id
          ac
          an
          ac_hemi
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
    <Query
      query={query}
      variables={{ datasetId, variantId }}
      loadingMessage="Loading variant"
      errorMessage="Unable to load variant"
      success={data => data.structural_variant}
    >
      {({ data }) => {
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

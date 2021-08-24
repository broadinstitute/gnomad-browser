import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, Page } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'

import ShortTandemRepeatLocusAttributes from './ShortTandemRepeatLocusAttributes'
import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatRepeatCounts from './ShortTandemRepeatRepeatCounts'
import ShortTandemRepeatVariantAttributes from './ShortTandemRepeatVariantAttributes'

const ResponsiveSection = styled.section`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const FlexWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  width: 100%;
`

const ShortTandemRepeatPage = ({ shortTandemRepeat }) => {
  return (
    <>
      <FlexWrapper>
        <ResponsiveSection>
          <ShortTandemRepeatLocusAttributes shortTandemRepeat={shortTandemRepeat} />
        </ResponsiveSection>
        <ResponsiveSection>
          <h2>External Resources</h2>
          <List>
            <ListItem>
              <ExternalLink href={`https://stripy.org/database/${shortTandemRepeat.stripy_id}`}>
                STRipy
              </ExternalLink>
            </ListItem>
          </List>
        </ResponsiveSection>
      </FlexWrapper>

      <section>
        <h2>Variants</h2>
        {shortTandemRepeat.variants.map(shortTandemRepeatVariant => {
          return (
            <section key={shortTandemRepeatVariant.id}>
              <h3>{shortTandemRepeatVariant.id}</h3>
              <ShortTandemRepeatVariantAttributes
                shortTandemRepeatVariant={shortTandemRepeatVariant}
              />
              <ShortTandemRepeatRepeatCounts
                shortTandemRepeatVariant={shortTandemRepeatVariant}
                thresholds={[
                  {
                    label: 'Benign threshold',
                    value: shortTandemRepeat.associated_disease.benign_threshold + 1,
                  },
                  {
                    label: 'Pathogenic threshold',
                    value: shortTandemRepeat.associated_disease.pathogenic_threshold,
                  },
                  {
                    label: 'Read length (150 bp)',
                    value: Math.floor(150 / shortTandemRepeatVariant.repeat_unit.length) + 1,
                  },
                ]}
              />
            </section>
          )
        })}
      </section>
    </>
  )
}

ShortTandemRepeatPage.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
}

const query = `
query ShortTandemRepeat($locusId: String!, $datasetId: DatasetId!) {
  short_tandem_repeat(locus_id: $locusId, dataset: $datasetId) {
    locus_id
    gene {
      ensembl_id
      symbol
      region
    }
    inheritance_mode
    associated_disease {
      name
      omim_id
      benign_threshold
      pathogenic_threshold
    }
    stripy_id
    variants {
      id
      region {
        chrom
        start
        stop
      }
      repeat_unit
      repeats
      populations {
        id
        repeats
      }
    }
  }
}
`

const ShortTandemRepeatPageContainer = ({ datasetId, locusId }) => {
  return (
    <Page>
      <DocumentTitle title={`${locusId} | Short Tandem Repeat | ${labelForDataset(datasetId)}`} />
      <GnomadPageHeading
        datasetOptions={{
          includeShortVariants: true,
          includeStructuralVariants: false,
          includeExac: false,
          includeGnomad2: false,
          includeGnomad3: true,
          includeGnomad3Subsets: false,
        }}
        selectedDataset={datasetId}
      >
        Short Tandem Repeat: {locusId}
      </GnomadPageHeading>
      <Query
        query={query}
        variables={{
          datasetId,
          locusId,
        }}
        loadingMessage="Loading short tandem repeat"
        errorMessage="Unable to load short tandem repeat"
        success={data => data.short_tandem_repeat}
      >
        {({ data }) => {
          return <ShortTandemRepeatPage shortTandemRepeat={data.short_tandem_repeat} />
        }}
      </Query>
    </Page>
  )
}

ShortTandemRepeatPageContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
  locusId: PropTypes.string.isRequired,
}

export default ShortTandemRepeatPageContainer

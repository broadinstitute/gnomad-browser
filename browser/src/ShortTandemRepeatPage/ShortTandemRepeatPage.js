import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, Page } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Query from '../Query'

import ShortTandemRepeatAttributes from './ShortTandemRepeatAttributes'
import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatRepeatCounts from './ShortTandemRepeatRepeatCounts'
import ShortTandemRepeatAdjacentRepeatAttributes from './ShortTandemRepeatAdjacentRepeatAttributes'

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
      <FlexWrapper style={{ marginBottom: '2em' }}>
        <ResponsiveSection>
          <ShortTandemRepeatAttributes shortTandemRepeat={shortTandemRepeat} />
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

      <ShortTandemRepeatRepeatCounts
        shortTandemRepeat={shortTandemRepeat}
        thresholds={[
          {
            label: 'Normal threshold',
            value: shortTandemRepeat.associated_disease.normal_threshold + 1,
          },
          {
            label: 'Pathogenic threshold',
            value: shortTandemRepeat.associated_disease.pathogenic_threshold,
          },
          {
            label: 'Read length (150 bp)',
            value: Math.floor(150 / shortTandemRepeat.repeat_unit.length) + 1,
          },
        ]}
      />

      {shortTandemRepeat.adjacent_repeats.length > 0 && (
        <section style={{ marginTop: '2em' }}>
          <h2>Adjacent Repeats</h2>
          {shortTandemRepeat.adjacent_repeats.map(adjacentRepeat => {
            return (
              <section key={adjacentRepeat.id} style={{ marginBottom: '2em' }}>
                <h3>{adjacentRepeat.id}</h3>
                <ShortTandemRepeatAdjacentRepeatAttributes adjacentRepeat={adjacentRepeat} />
                <ShortTandemRepeatRepeatCounts
                  shortTandemRepeat={adjacentRepeat}
                  thresholds={[
                    {
                      label: 'Read length (150 bp)',
                      value: Math.floor(150 / adjacentRepeat.repeat_unit.length) + 1,
                    },
                  ]}
                />
              </section>
            )
          })}
        </section>
      )}
    </>
  )
}

ShortTandemRepeatPage.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
}

const query = `
query ShortTandemRepeat($strId: String!, $datasetId: DatasetId!) {
  short_tandem_repeat(id: $strId, dataset: $datasetId) {
    id
    gene {
      ensembl_id
      symbol
      region
    }
    inheritance_mode
    associated_disease {
      name
      omim_id
      normal_threshold
      pathogenic_threshold
    }
    reference_region {
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
    stripy_id
    adjacent_repeats {
      id
      reference_region {
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

const ShortTandemRepeatPageContainer = ({ datasetId, strId }) => {
  return (
    <Page>
      <DocumentTitle title={`${strId} | Short Tandem Repeat | ${labelForDataset(datasetId)}`} />
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
        Short Tandem Repeat: {strId}
      </GnomadPageHeading>
      <Query
        query={query}
        variables={{
          datasetId,
          strId,
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
  strId: PropTypes.string.isRequired,
}

export default ShortTandemRepeatPageContainer

import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable, ExternalLink, Page } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import TableWrapper from '../TableWrapper'

const ShortTandemRepeatsPage = ({ shortTandemRepeats }) => {
  return (
    <TableWrapper>
      <BaseTable style={{ minWidth: '100%' }}>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Repeat unit</th>
            <th scope="col">Region</th>
            <th scope="col">Inheritance mode</th>
            <th scope="col">Associated disease</th>
          </tr>
        </thead>
        <tbody>
          {shortTandemRepeats.map(shortTandemRepeat => {
            return (
              <tr key={shortTandemRepeat.id}>
                <th scope="row">
                  <Link to={`/short-tandem-repeat/${shortTandemRepeat.id}`}>
                    {shortTandemRepeat.id}
                  </Link>
                </th>
                <td>{shortTandemRepeat.repeat_unit}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{shortTandemRepeat.gene.region}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{shortTandemRepeat.inheritance_mode}</td>
                <td style={{ minWidth: '30ch' }}>
                  <ExternalLink
                    href={`https://omim.org/entry/${shortTandemRepeat.associated_disease.omim_id}`}
                  >
                    {shortTandemRepeat.associated_disease.name}
                  </ExternalLink>
                </td>
              </tr>
            )
          })}
        </tbody>
      </BaseTable>
    </TableWrapper>
  )
}

ShortTandemRepeatsPage.propTypes = {
  shortTandemRepeats: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      gene: PropTypes.shape({
        ensembl_id: PropTypes.string.isRequired,
        symbol: PropTypes.string.isRequired,
        region: PropTypes.string.isRequired,
      }).isRequired,
      repeat_unit: PropTypes.string.isRequired,
      associated_disease: PropTypes.shape({
        name: PropTypes.string.isRequired,
        omim_id: PropTypes.string.isRequired,
      }).isRequired,
      inheritance_mode: PropTypes.string.isRequired,
    })
  ).isRequired,
}

const query = `
query ShortTandemRepeats($datasetId: DatasetId!) {
  short_tandem_repeats(dataset: $datasetId) {
    id
    gene {
      ensembl_id
      symbol
      region
    }
    repeat_unit
    associated_disease {
      name
      omim_id
    }
    inheritance_mode
  }
}
`

const ShortTandemRepeatsPageContainer = ({ datasetId }) => {
  return (
    <Page>
      <DocumentTitle title={`Short Tandem Repeats | ${labelForDataset(datasetId)}`} />
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
        Short Tandem Repeats
      </GnomadPageHeading>
      {datasetId === 'gnomad_r3' ? (
        <Query
          query={query}
          variables={{ datasetId }}
          loadingMessage="Loading short tandem repeats"
          errorMessage="Unable to load short tandem repeats"
          success={data => data.short_tandem_repeats}
        >
          {({ data }) => {
            return (
              <ShortTandemRepeatsPage
                datasetId={datasetId}
                shortTandemRepeats={data.short_tandem_repeats}
              />
            )
          }}
        </Query>
      ) : (
        <StatusMessage>
          Short tandem repeats are not available in {labelForDataset(datasetId)}
          <br />
          <br />
          <Link to="/short-tandem-repeats?dataset=gnomad_r3" preserveSelectedDataset={false}>
            View short tandem repeats in gnomAD v3.1
          </Link>
        </StatusMessage>
      )}
    </Page>
  )
}

ShortTandemRepeatsPageContainer.propTypes = {
  datasetId: PropTypes.string.isRequired,
}

export default ShortTandemRepeatsPageContainer

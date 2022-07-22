import React from 'react'

import { BaseTable, ExternalLink, Page } from '@gnomad/ui'

import { labelForDataset } from '../datasets'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import TableWrapper from '../TableWrapper'

type ShortTandemRepeatsPageProps = {
  shortTandemRepeats: {
    id: string
    gene: {
      ensembl_id: string
      symbol: string
      region: string
    }
    reference_repeat_unit: string
    associated_diseases: {
      name: string
      symbol: string
      omim_id?: string
      inheritance_mode: string
    }[]
  }[]
}

const ShortTandemRepeatsPage = ({ shortTandemRepeats }: ShortTandemRepeatsPageProps) => {
  return (
    <TableWrapper>
      {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
      <BaseTable style={{ minWidth: '100%' }}>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Reference repeat unit</th>
            <th scope="col">Region</th>
            <th scope="col">Inheritance mode</th>
            <th scope="col">Associated disease(s)</th>
          </tr>
        </thead>
        <tbody>
          {shortTandemRepeats.map((shortTandemRepeat) => {
            return (
              <tr key={shortTandemRepeat.id}>
                <th scope="row" style={{ whiteSpace: 'nowrap' }}>
                  <Link to={`/short-tandem-repeat/${shortTandemRepeat.id}`}>
                    {shortTandemRepeat.id}
                  </Link>
                </th>
                <td style={{ minWidth: '18ch' }}>{shortTandemRepeat.reference_repeat_unit}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{shortTandemRepeat.gene.region}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {Array.from(
                    new Set(
                      shortTandemRepeat.associated_diseases.map(
                        (disease) => disease.inheritance_mode
                      )
                    )
                  ).join(', ')}
                </td>
                <td style={{ minWidth: '30ch' }}>
                  {shortTandemRepeat.associated_diseases
                    .map((disease) => {
                      return (
                        <React.Fragment key={disease.name}>
                          {disease.omim_id ? (
                            // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
                            <ExternalLink href={`https://omim.org/entry/${disease.omim_id}`}>
                              {disease.name}
                            </ExternalLink>
                          ) : (
                            disease.name
                          )}
                        </React.Fragment>
                      )
                    })
                    .flatMap((el: any) => [', ', el])
                    .slice(1)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </BaseTable>
    </TableWrapper>
  )
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
    reference_repeat_unit
    associated_diseases {
      name
      symbol
      omim_id
      inheritance_mode
    }
  }
}
`

type ShortTandemRepeatsPageContainerProps = {
  datasetId: string
}

const ShortTandemRepeatsPageContainer = ({ datasetId }: ShortTandemRepeatsPageContainerProps) => {
  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title={`Pathogenic Short Tandem Repeats | ${labelForDataset(datasetId)}`} />
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
        Pathogenic Short Tandem Repeats
      </GnomadPageHeading>
      {datasetId === 'gnomad_r3' ? (
        <Query
          query={query}
          variables={{ datasetId }}
          loadingMessage="Loading short tandem repeats"
          errorMessage="Unable to load short tandem repeats"
          success={(data: any) => data.short_tandem_repeats}
        >
          {({ data }: any) => {
            return (
              <ShortTandemRepeatsPage
                // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; shortTandemRepeats: any... Remove this comment to see the full error message
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

export default ShortTandemRepeatsPageContainer

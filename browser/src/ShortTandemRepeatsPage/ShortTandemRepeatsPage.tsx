import React from 'react'

import { BaseTable, ExternalLink, Page } from '@gnomad/ui'

import {
  DatasetId,
  hasShortTandemRepeats,
  labelForDataset,
} from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import TableWrapper from '../TableWrapper'

import useTableSort, { stringCompareFunction, ColumnSpecifier } from '../useTableSort'

type ShortTandemRepeat = {
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
}

type ShortTandemRepeatsPageProps = {
  shortTandemRepeats: ShortTandemRepeat[]
}

type NormalizedShortTandemRepeat = {
  id: string
  reference_repeat_unit: string
  region: string
  inheritance_modes: string[]
  associated_diseases: {
    name: string
    omim_id?: string
  }[]
  // These two could be recomputed on the fly, but it's simpler and more
  // efficient to do so once up front.
  inheritance_mode_compare_key: string
  associated_disease_name_compare_key: string
}

const columnSpecifiers: ColumnSpecifier<NormalizedShortTandemRepeat>[] = [
  { key: 'id', label: 'ID', tooltip: null, compareValueFunction: stringCompareFunction('id') },
  {
    key: 'reference_repeat_unit',
    label: 'Reference repeat unit',
    tooltip: null,
    compareValueFunction: stringCompareFunction('reference_repeat_unit'),
  },
  {
    key: 'region',
    label: 'Region',
    tooltip: null,
    compareValueFunction: stringCompareFunction('region'),
  },
  {
    key: 'inheritance_modes',
    label: 'Inheritance mode',
    tooltip: null,
    compareValueFunction: stringCompareFunction('inheritance_mode_compare_key'),
  },
  {
    key: 'associated_diseases',
    label: 'Associated disease(s)',
    tooltip: null,
    compareValueFunction: stringCompareFunction('associated_disease_name_compare_key'),
  },
]

const normalizeShortTandemRepeat = (
  shortTandemRepeat: ShortTandemRepeat
): NormalizedShortTandemRepeat => {
  const { id, reference_repeat_unit } = shortTandemRepeat
  const region = shortTandemRepeat.gene.region

  const inheritance_modes = Array.from(
    new Set(shortTandemRepeat.associated_diseases.map((disease) => disease.inheritance_mode))
  ).sort()
  const associated_diseases = shortTandemRepeat.associated_diseases
    .map(({ name, omim_id }) => ({
      name,
      omim_id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const inheritance_mode_compare_key = inheritance_modes.join('_')
  const associated_disease_name_compare_key = associated_diseases
    .map((disease) => disease.name)
    .join('_')

  return {
    id,
    reference_repeat_unit,
    inheritance_modes,
    region,
    associated_diseases,
    inheritance_mode_compare_key,
    associated_disease_name_compare_key,
  }
}

const ShortTandemRepeatsPage = ({ shortTandemRepeats }: ShortTandemRepeatsPageProps) => {
  const { headers, sortedRowData } = useTableSort(
    columnSpecifiers,
    'id',
    shortTandemRepeats.map(normalizeShortTandemRepeat)
  )

  return (
    <>
      <p>
        For more information about Tandem Repeats in gnomAD, read our{' '}
        <a href="https://gnomad.broadinstitute.org/news/2022-01-the-addition-of-short-tandem-repeat-calls-to-gnomad/">
          blog post
        </a>
        .
      </p>

      <TableWrapper>
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <BaseTable style={{ minWidth: '100%' }}>
          <thead>
            <tr>{headers}</tr>
          </thead>
          <tbody>
            {sortedRowData.map((shortTandemRepeat) => {
              return (
                <tr key={shortTandemRepeat.id}>
                  <th scope="row" style={{ whiteSpace: 'nowrap' }}>
                    <Link to={`/short-tandem-repeat/${shortTandemRepeat.id}`}>
                      {shortTandemRepeat.id}
                    </Link>
                  </th>
                  <td style={{ minWidth: '18ch' }}>{shortTandemRepeat.reference_repeat_unit}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{shortTandemRepeat.region}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {shortTandemRepeat.inheritance_modes.join(', ')}
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
    </>
  )
}

const operationName = 'ShortTandemRepeats'
const query = `
query ${operationName}($datasetId: DatasetId!) {
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
  datasetId: DatasetId
}

const ShortTandemRepeatsPageContainer = ({ datasetId }: ShortTandemRepeatsPageContainerProps) => {
  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title={`Tandem Repeats | ${labelForDataset(datasetId)}`} />
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
        Tandem Repeats
      </GnomadPageHeading>
      {hasShortTandemRepeats(datasetId) ? (
        <Query
          operationName={operationName}
          query={query}
          variables={{ datasetId }}
          loadingMessage="Loading tandem repeats"
          errorMessage="Unable to load tandem repeats"
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
          Tandem repeats are not available in {labelForDataset(datasetId)}
          <br />
          <br />
          <Link to="/short-tandem-repeats?dataset=gnomad_r3" preserveSelectedDataset={false}>
            View tandem repeats in gnomAD v3.1
          </Link>
        </StatusMessage>
      )}
    </Page>
  )
}

export default ShortTandemRepeatsPageContainer

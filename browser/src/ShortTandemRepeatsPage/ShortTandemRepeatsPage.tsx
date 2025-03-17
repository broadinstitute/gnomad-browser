import React from 'react'

import { BaseTable, Page } from '@gnomad/ui'

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
  main_reference_region: {
    chrom: string
    start: number
    stop: number
  }
  reference_repeat_unit: string
  strchive_id: string
  associated_diseases: {
    symbol: string
    name: string
    omim_id?: string
    inheritance_mode: string
  }[]
}

type ShortTandemRepeatsPageProps = {
  shortTandemRepeats: ShortTandemRepeat[]
}

type NormalizedShortTandemRepeat = {
  id: string
  main_reference_region: string
  reference_repeat_unit: string
  strchive_id: string
  region: string
  links: string
  inheritance_modes: string[]
  associated_diseases: {
    symbol: string
    name: string
    omim_id?: string
  }[]
  // These two could be recomputed on the fly, but it's simpler and more
  // efficient to do so once up front.
  reference_repeat_unit_compare_key: string
  inheritance_mode_compare_key: string
  associated_disease_name_compare_key: string
}

const INHERITANCE_MODE_ABBREVIATIONS = {
  'Autosomal dominant': 'AD',
  'Autosomal recessive': 'AR',
  'X-linked dominant': 'XD',
  'X-linked recessive': 'XR',
} as const

const columnSpecifiers: ColumnSpecifier<NormalizedShortTandemRepeat>[] = [
  { key: 'id', label: 'ID', tooltip: null, compareValueFunction: stringCompareFunction('id') },
  {
    key: 'main_reference_region',
    label: 'Reference region',
    tooltip: null,
    compareValueFunction: stringCompareFunction('main_reference_region'),
  },
  {
    key: 'reference_repeat_unit',
    label: 'Repeat unit',
    tooltip: null,
    compareValueFunction: stringCompareFunction('reference_repeat_unit_compare_key'),
  },
  {
    key: 'region',
    label: 'Gene region',
    tooltip: null,
    compareValueFunction: stringCompareFunction('region'),
  },
  {
    key: 'inheritance_modes',
    label: 'Inheritance',
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
  const { id, main_reference_region, reference_repeat_unit, strchive_id } = shortTandemRepeat
  const main_reference_region_id = `${main_reference_region.chrom}:${main_reference_region.start}-${main_reference_region.stop}`
  const region = shortTandemRepeat.gene.region
  const inheritance_modes = Array.from(
    new Set(
      shortTandemRepeat.associated_diseases.map(
        (disease) =>
          INHERITANCE_MODE_ABBREVIATIONS[
            disease.inheritance_mode as keyof typeof INHERITANCE_MODE_ABBREVIATIONS
          ] || disease.inheritance_mode
      )
    )
  ).sort()
  const associated_diseases = shortTandemRepeat.associated_diseases
    .map(({ symbol, name, omim_id }) => ({
      symbol,
      name,
      omim_id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const reference_repeat_unit_compare_key = `${reference_repeat_unit.length
    .toString()
    .padStart(3, '0')} ${reference_repeat_unit}`
  const inheritance_mode_compare_key = inheritance_modes.join('_')
  const associated_disease_name_compare_key = associated_diseases
    .map((disease) => `${disease.symbol}: ${disease.name}`)
    .join('_')

  const links = ''

  return {
    id,
    main_reference_region: main_reference_region_id,
    reference_repeat_unit,
    strchive_id,
    inheritance_modes,
    region,
    links,
    associated_diseases,
    reference_repeat_unit_compare_key,
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
        For more information about Tandem Repeats in gnomAD, see our{' '}
        <a href="https://gnomad.broadinstitute.org/news/2022-01-the-addition-of-short-tandem-repeat-calls-to-gnomad/">
          blog post
        </a>{' '}
        and the{' '}
        <a href="https://gnomad.broadinstitute.org/news/changelog/2025-03-known-disease-associated-tandem-repeat-pages">
          change log for March, 2025
        </a>
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
                  <td style={{ minWidth: '20ch' }}>{shortTandemRepeat.main_reference_region}</td>
                  <td
                    style={{
                      minWidth: '22ch',
                      maxWidth: '22ch',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {shortTandemRepeat.reference_repeat_unit} (
                    {shortTandemRepeat.reference_repeat_unit.length})
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{shortTandemRepeat.region}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {shortTandemRepeat.inheritance_modes.join(', ')}
                  </td>
                  <td style={{ minWidth: '40ch' }}>
                    {shortTandemRepeat.associated_diseases
                      .map((disease) => {
                        return (
                          <React.Fragment key={disease.name}>
                            <div style={{ display: 'inline-block', padding: '3px 0px' }}>
                              {disease.symbol}: {disease.name}
                            </div>
                          </React.Fragment>
                        )
                      })
                      .flatMap((el: any) => [<br />, el])
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
    main_reference_region {
      chrom
      start
      stop
    }
    reference_repeat_unit
    strchive_id
    associated_diseases {
      symbol
      name
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

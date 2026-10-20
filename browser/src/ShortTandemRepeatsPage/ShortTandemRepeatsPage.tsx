import React from 'react'

import { BaseTable, Page, TooltipAnchor } from '@gnomad/ui'

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
import {
  colorForAverageGenotypeQuality,
  GenotypeQuality,
  qualityDescriptionLabels,
  reviewedGenotypeQualitiesFromLowToHigh,
} from '../ShortTandemRepeatPage/qualityDescription'

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
  average_quality_of_manually_reviewed_genotypes: number | null
  manually_reviewed_genotype_counts_by_quality: ManuallyReviewedGenotypeCount[]
}

type ManuallyReviewedGenotypeCount = {
  quality_description: GenotypeQuality
  genotype_count: number
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
  average_quality_of_manually_reviewed_genotypes: number | null
  manually_reviewed_genotype_counts_by_quality: ManuallyReviewedGenotypeCount[]
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

// Loci with no manually reviewed genotypes count as lower than every reviewed locus.
const compareAverageQualityOfManuallyReviewedGenotypes = (
  a: NormalizedShortTandemRepeat,
  b: NormalizedShortTandemRepeat
) =>
  (a.average_quality_of_manually_reviewed_genotypes ?? 0) -
  (b.average_quality_of_manually_reviewed_genotypes ?? 0)

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
  {
    key: 'average_quality_of_manually_reviewed_genotypes',
    label: 'GQ',
    tooltip:
      'Genotype quality (GQ): the average manual review quality of the genotypes at this locus, from 1 (Low) to 5 (High). Blank if no genotypes were manually reviewed.',
    compareValueFunction: compareAverageQualityOfManuallyReviewedGenotypes,
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
    average_quality_of_manually_reviewed_genotypes:
      shortTandemRepeat.average_quality_of_manually_reviewed_genotypes,
    manually_reviewed_genotype_counts_by_quality:
      shortTandemRepeat.manually_reviewed_genotype_counts_by_quality,
    reference_repeat_unit_compare_key,
    inheritance_mode_compare_key,
    associated_disease_name_compare_key,
  }
}

const AverageGenotypeQualitySquare = ({
  averageQuality,
  genotypeCountsByQuality,
}: {
  averageQuality: number
  genotypeCountsByQuality: ManuallyReviewedGenotypeCount[]
}) => {
  const genotypeCount = (quality: GenotypeQuality) =>
    genotypeCountsByQuality.find((count) => count.quality_description === quality)
      ?.genotype_count ?? 0
  // For example "15 = High, 3 = Medium-high, 2 = Medium-low, 9 = Low", leaving out qualities
  // with no genotypes
  const countsText = [...reviewedGenotypeQualitiesFromLowToHigh]
    .reverse()
    .filter((quality) => genotypeCount(quality) > 0)
    .map((quality) => `${genotypeCount(quality)} = ${qualityDescriptionLabels[quality]}`)
    .join(', ')
  const numberOfReviewedGenotypes = reviewedGenotypeQualitiesFromLowToHigh.reduce(
    (sum, quality) => sum + genotypeCount(quality),
    0
  )
  const reviewedGenotypesText =
    numberOfReviewedGenotypes === 1
      ? '1 genotype that is the largest outlier'
      : `${numberOfReviewedGenotypes} genotypes that are the largest outliers`
  const roundedAverageQuality = averageQuality.toFixed(2)
  const description = `Average genotype quality is ${roundedAverageQuality} at this locus (${countsText}). This is based on manual review of read visualizations from ${reviewedGenotypesText} relative to the overall allele size distribution at this locus. On the locus page, select 'Color by: "GQ: manual review"' to see this in more detail.`
  return (
    // @ts-expect-error TS(2322) -- error from gnomad-browser-toolkit component
    <TooltipAnchor tooltip={description}>
      <span
        role="img"
        aria-label={description}
        style={{
          display: 'inline-block',
          width: '15px',
          height: '15px',
          verticalAlign: 'middle',
          backgroundColor: colorForAverageGenotypeQuality(averageQuality),
        }}
      />
    </TooltipAnchor>
  )
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
        <a href="https://gnomad.broadinstitute.org/news/2025-03-known-disease-associated-tandem-repeat-pages/">
          change log for March, 2025
        </a>
      </p>

      <TableWrapper>
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
                  <td>
                    {shortTandemRepeat.average_quality_of_manually_reviewed_genotypes !== null && (
                      <AverageGenotypeQualitySquare
                        averageQuality={
                          shortTandemRepeat.average_quality_of_manually_reviewed_genotypes
                        }
                        genotypeCountsByQuality={
                          shortTandemRepeat.manually_reviewed_genotype_counts_by_quality
                        }
                      />
                    )}
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
    average_quality_of_manually_reviewed_genotypes
    manually_reviewed_genotype_counts_by_quality {
      quality_description
      genotype_count
    }
  }
}
`

type ShortTandemRepeatsPageContainerProps = {
  datasetId: DatasetId
}

const ShortTandemRepeatsPageContainer = ({ datasetId }: ShortTandemRepeatsPageContainerProps) => {
  return (
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

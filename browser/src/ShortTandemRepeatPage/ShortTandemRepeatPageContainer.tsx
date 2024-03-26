import React from 'react'

import { DatasetId, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import { Page } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'

import Query from '../Query'
import ShortTandemRepeatPage from './ShortTandemRepeatPage'

const operationName = 'ShortTandemRepeat'
const query = `
query ${operationName}($strId: String!, $datasetId: DatasetId!) {
  short_tandem_repeat(id: $strId, dataset: $datasetId) {
    id
    gene {
      ensembl_id
      symbol
      region
    }
    associated_diseases {
      name
      symbol
      omim_id
      inheritance_mode
      repeat_size_classifications {
        classification
        min
        max
      }
      notes
    }
    reference_region {
      chrom
      start
      stop
    }
    reference_repeat_unit
    repeat_units {
      repeat_unit
      classification
    }
    allele_size_distribution {
      distribution
      ancestry_groups {
        id
        distribution
      }
      repeat_units {
        repeat_unit
        distribution
        ancestry_groups {
          id
          distribution
        }
      }
    }
    genotype_distribution {
      distribution
      ancestry_groups {
        id
        distribution
      }
      repeat_units {
        repeat_units
        distribution
        ancestry_groups {
          id
          distribution
        }
      }
    }
    age_distribution {
      age_range
      distribution
    }
    stripy_id
    adjacent_repeats {
      id
      reference_region {
        chrom
        start
        stop
      }
      reference_repeat_unit
      repeat_units
      allele_size_distribution {
        distribution
        ancestry_groups {
          id
          distribution
        }
        repeat_units {
          repeat_unit
          distribution
          ancestry_groups {
            id
            distribution
          }
        }
      }
      genotype_distribution {
        distribution
        ancestry_groups {
          id
          distribution
        }
        repeat_units {
          repeat_units
          distribution
          ancestry_groups {
            id
            distribution
          }
        }
      }
    }
  }
}
`

type ShortTandemRepeatPageContainerProps = {
  datasetId: DatasetId
  strId: string
}

const ShortTandemRepeatPageContainer = ({
  datasetId,
  strId,
}: ShortTandemRepeatPageContainerProps) => {
  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title={`${strId} | Tandem Repeat | ${labelForDataset(datasetId)}`} />
      <GnomadPageHeading
        datasetOptions={{
          includeShortVariants: true,
          includeStructuralVariants: false,
          includeCopyNumberVariants: false,
          includeExac: false,
          includeGnomad2: false,
          includeGnomad3: true,
          includeGnomad3Subsets: false,
        }}
        selectedDataset={datasetId}
      >
        Tandem Repeat: <span>{strId}</span>
      </GnomadPageHeading>
      <Query
        operationName={operationName}
        query={query}
        variables={{
          datasetId,
          strId,
        }}
        loadingMessage="Loading tandem repeat data"
        errorMessage="Unable to load tandem repeat data"
        success={(data: any) => data.short_tandem_repeat}
      >
        {({ data }: any) => {
          return (
            <ShortTandemRepeatPage
              datasetId={datasetId}
              shortTandemRepeat={data.short_tandem_repeat}
            />
          )
        }}
      </Query>
    </Page>
  )
}

export default ShortTandemRepeatPageContainer

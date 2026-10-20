import React from 'react'
import styled from 'styled-components'
import { isCompleteExactContext } from '@gnomad/dataset-metadata/longReadTrCatalogContext'

import Link from '../Link'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import ShortTandemRepeatAssociatedDiseasesTable from '../ShortTandemRepeatPage/ShortTandemRepeatAssociatedDiseasesTable'
import { LongReadTrShortReadContext } from './types'

const ContextSection = styled.section`
  min-width: 0;
  margin-top: 2.4em;
`

const TableScroller = styled.div`
  overflow-x: auto;
  max-width: 100%;
`

type Props = {
  lrCohort: LongReadCohort
  context: LongReadTrShortReadContext | null
}

const ShortReadKnownLocusContext = ({ lrCohort, context }: Props) => {
  if (!isCompleteExactContext(context, lrCohort)) return null

  const record = context.catalog_record

  return (
    <ContextSection aria-labelledby="lr-tr-known-disease-context-heading">
      <h2 id="lr-tr-known-disease-context-heading">Known disease-associated TR locus</h2>

      {record.associated_diseases.length > 0 && (
        <TableScroller
          role="region"
          aria-label="Known disease-associated TR locus disease table"
          tabIndex={0}
        >
          <ShortTandemRepeatAssociatedDiseasesTable
            associatedDiseases={record.associated_diseases}
            showNotes={false}
            repeatRangesHeading="Catalog repeat-count ranges"
          />
        </TableScroller>
      )}

      <p>
        <Link
          to={`/short-tandem-repeat/${record.id}?dataset=gnomad_r4`}
          preserveSelectedDataset={false}
        >
          View {record.id} in gnomAD short-read data
        </Link>
      </p>
    </ContextSection>
  )
}

export default ShortReadKnownLocusContext

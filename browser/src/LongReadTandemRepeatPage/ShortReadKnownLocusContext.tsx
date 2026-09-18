import React from 'react'
import styled from 'styled-components'
import { isCompleteExactContext } from '@gnomad/dataset-metadata/longReadTrCatalogContext'

import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import Link from '../Link'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import ShortTandemRepeatAssociatedDiseasesTable from '../ShortTandemRepeatPage/ShortTandemRepeatAssociatedDiseasesTable'
import { LongReadTrShortReadContext } from './types'

const ContextSection = styled.section`
  min-width: 0;
  margin-top: 2.4em;
`

const HeadingRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35em;

  h2 {
    margin-right: 0;
  }
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
      <HeadingRow>
        <h2 id="lr-tr-known-disease-context-heading">Known disease-associated TR locus</h2>
        <HaplotypeHelpButton title="About known disease-associated TR locus">
          <p style={{ marginTop: 0 }}>
            <strong>What this shows.</strong> Disease names and repeat-count ranges from a catalog
            locus admitted only by exact coordinate-and-stored-motif identity.
          </p>
          <p>
            <strong>How to use it.</strong> Review the catalog disease table, or follow the link
            below it to the corresponding gnomAD short-read data page.
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>What it does not show.</strong> The exact catalog match and its reference
            information do not classify, filter, or select any LR allele, genotype, person,
            component, cluster, or length measurement.
          </p>
        </HaplotypeHelpButton>
      </HeadingRow>

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

import React from 'react'
import styled from 'styled-components'

import AttributeList, { AttributeListItem } from '../AttributeList'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import Link from '../Link'
import ShortTandemRepeatAssociatedDiseasesTable from '../ShortTandemRepeatPage/ShortTandemRepeatAssociatedDiseasesTable'
import { LongReadTrShortReadContext } from './types'

const ContextPanel = styled.section`
  padding: 1em;
  border: 1px solid #aebbc4;
  margin-top: 2.4em;
  border-radius: 4px;
  background: #fbfcfd;
`

const HeadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35em;

  h2 {
    margin-right: 0;
  }
`

const ExactBadge = styled.span`
  display: inline-block;
  padding: 0.15em 0.45em;
  border: 1px solid #287a3e;
  margin-left: 0.5em;
  border-radius: 3px;
  background: #edf8ef;
  color: #18592b;
  font-size: 0.7em;
  font-weight: normal;
  vertical-align: middle;
  white-space: nowrap;
`

const TableScroller = styled.div`
  overflow-x: auto;
`

const MotifTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 0.45em 0.6em;
    border-bottom: 1px solid #d8dee2;
    text-align: left;
    vertical-align: top;
  }
`

const Disclaimer = styled.p`
  padding: 0.75em;
  border-left: 4px solid #596a75;
  margin-bottom: 0;
  background: #f1f4f6;
`

type Props = {
  context: LongReadTrShortReadContext | null
}

type MotifRow = { repeat_unit: string; classification: string }

const CatalogMotifTable = ({
  rows,
  label,
  referenceRepeatUnit,
}: {
  rows: MotifRow[]
  label: string
  referenceRepeatUnit: string
}) => (
  <TableScroller>
    <MotifTable aria-label={label}>
      <thead>
        <tr>
          <th scope="col">Repeat unit</th>
          <th scope="col">Role</th>
          <th scope="col">Catalog label</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const matched = row.repeat_unit === referenceRepeatUnit
          return (
            // Raw catalog order and duplicate entries are provenance-bearing.
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`${row.repeat_unit}-${row.classification}-${index}`}>
              <th scope="row">
                <code>{row.repeat_unit}</code>
              </th>
              <td>{matched ? 'Matched catalog reference repeat unit' : 'Other catalog motif'}</td>
              <td>{row.classification}</td>
            </tr>
          )
        })}
      </tbody>
    </MotifTable>
  </TableScroller>
)

const ShortReadKnownLocusContext = ({ context }: Props) => {
  if (
    context?.status !== 'EXACT_UNIQUE' ||
    !context.catalog_record ||
    context.matched_component_index == null ||
    !context.matched_component
  ) {
    return null
  }

  const record = context.catalog_record
  const component = context.matched_component
  const componentNumber = context.matched_component_index + 1
  const primaryMotifs = record.repeat_units.filter(
    (unit) => unit.repeat_unit === record.reference_repeat_unit || unit.repeat_unit.length > 1
  )
  const matchedClassifications = context.matched_reference_repeat_unit_classifications
  const matchedClassificationText = matchedClassifications.length
    ? matchedClassifications.join(', ')
    : 'No catalog label'

  return (
    <ContextPanel aria-labelledby="lr-tr-short-read-context-heading">
      <HeadingRow>
        <h2 id="lr-tr-short-read-context-heading">
          Short-read known-locus context
          <ExactBadge>Exact reference-component match</ExactBadge>
        </h2>
        <HaplotypeHelpButton title="About short-read known-locus context">
          <p style={{ marginTop: 0 }}>
            <strong>What this shows.</strong> Data copied from the short-read catalog record whose
            GRCh38 reference region and stored repeat unit exactly match one LR reference component.
          </p>
          <p>
            <strong>How to use it.</strong> Follow the known-locus link for short-read details, then
            read the matched component, disease records, repeat-count ranges, and motif labels here.
            Expand the disclosures for every raw catalog motif and provenance.
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>What it does not show.</strong> This coordinate-and-motif identity is not a
            clinical interpretation of LR observations.
          </p>
        </HaplotypeHelpButton>
      </HeadingRow>

      <AttributeList>
        <AttributeListItem label="Known STR locus">
          <Link
            to={`/short-tandem-repeat/${record.id}?dataset=gnomad_r4`}
            preserveSelectedDataset={false}
          >
            {record.id}
            {record.gene?.symbol ? ` (${record.gene.symbol})` : ''} short-read details
          </Link>
        </AttributeListItem>
        <AttributeListItem label="Matched LR reference component">
          Component {componentNumber}: chr{component.chrom}:
          {(component.start0 + 1).toLocaleString()}–{component.end0.toLocaleString()} (
          {component.motif}; {component.end0 - component.start0} bp)
        </AttributeListItem>
        <AttributeListItem label="Catalog reference repeat unit">
          <code>{record.reference_repeat_unit}</code> — {matchedClassificationText}
        </AttributeListItem>
      </AttributeList>

      {record.associated_diseases.length > 0 && (
        <>
          <h3>Disease, inheritance, and repeat-count ranges</h3>
          <TableScroller>
            <ShortTandemRepeatAssociatedDiseasesTable
              associatedDiseases={record.associated_diseases}
              showSymbols
            />
          </TableScroller>
        </>
      )}

      <h3>Catalog repeat units</h3>
      {primaryMotifs.length > 0 ? (
        <CatalogMotifTable
          rows={primaryMotifs}
          label="Primary short-read catalog repeat units"
          referenceRepeatUnit={record.reference_repeat_unit}
        />
      ) : (
        <p>No catalog repeat-unit labels are available.</p>
      )}

      <details>
        <summary>All catalog motifs ({record.repeat_units.length})</summary>
        <CatalogMotifTable
          rows={record.repeat_units}
          label="All short-read catalog motifs"
          referenceRepeatUnit={record.reference_repeat_unit}
        />
      </details>

      <Disclaimer>
        <strong>Short-read reference context only:</strong> these catalog data do not classify any
        LR allele, genotype, component, person, or total allele length change.
      </Disclaimer>

      <details>
        <summary>Short-read catalog provenance</summary>
        <dl>
          <dt>Dataset</dt>
          <dd>{context.catalog_dataset}</dd>
          <dt>Source</dt>
          <dd>{context.catalog_source}</dd>
          <dt>Catalog digest</dt>
          <dd>
            <code>{context.catalog_digest}</code>
          </dd>
          {context.lr_database && (
            <>
              <dt>Long-read database</dt>
              <dd>
                <code>{context.lr_database}</code>
              </dd>
            </>
          )}
          {context.lr_release && (
            <>
              <dt>Long-read release</dt>
              <dd>{context.lr_release}</dd>
            </>
          )}
          {context.lr_run_id && (
            <>
              <dt>Long-read run</dt>
              <dd>
                <code>{context.lr_run_id}</code>
              </dd>
            </>
          )}
        </dl>
      </details>
    </ContextPanel>
  )
}

export default ShortReadKnownLocusContext

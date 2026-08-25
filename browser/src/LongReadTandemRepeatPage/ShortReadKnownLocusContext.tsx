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

const MotifList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em 1.25em;
  padding: 0;
  margin: 0;
  list-style: none;
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

  return (
    <ContextPanel aria-labelledby="lr-tr-short-read-context-heading">
      <HeadingRow>
        <h2 id="lr-tr-short-read-context-heading">
          Short-read known-locus context
          <ExactBadge>Exact reference-component match</ExactBadge>
        </h2>
        <HaplotypeHelpButton title="About short-read known-locus context">
          <p style={{ marginTop: 0 }}>
            This panel appears only for an API-validated, unique GRCh38 match between one short-read
            catalog reference region and one ordered long-read reference component. Coordinates and
            the stored motif must match exactly.
          </p>
          <p>
            The catalog&apos;s repeat-count ranges and motif labels are copied as reference context.
            The coordinate match does not classify a long-read allele, genotype, total allele length
            change (ALT − REF, bp), or individual.
          </p>
          <p style={{ marginBottom: 0 }}>
            A component outline is shown only when the API authorizes it for the exact matching
            catalog motif. It marks reference identity, not a pathogenic long-read component.
          </p>
        </HaplotypeHelpButton>
      </HeadingRow>

      <AttributeList>
        <AttributeListItem label="Known locus">
          <Link
            to={`/short-tandem-repeat/${record.id}?dataset=gnomad_r4`}
            preserveSelectedDataset={false}
          >
            {record.id}
            {record.gene?.symbol ? ` (${record.gene.symbol})` : ''} short-read details
          </Link>
        </AttributeListItem>
        <AttributeListItem label="Exact matched component">
          Component {componentNumber}: chr{component.chrom}:
          {(component.start0 + 1).toLocaleString()}–{component.end0.toLocaleString()} (
          {component.motif}; {component.end0 - component.start0} bp)
        </AttributeListItem>
        <AttributeListItem label="Catalog reference source">
          Known disease-associated short-read TR catalog exposed on gnomAD v4 pages
          {context.matched_reference_region_index == null
            ? ''
            : `; reference region ${context.matched_reference_region_index + 1}`}
        </AttributeListItem>
      </AttributeList>

      <h3>Catalog repeat-unit labels</h3>
      <p>
        Reference repeat unit: <code>{record.reference_repeat_unit}</code>
      </p>
      {record.repeat_units.length > 0 ? (
        <MotifList aria-label="Short-read catalog repeat-unit classifications">
          {record.repeat_units.map((repeatUnit, index) => (
            // Raw catalog order and duplicate entries are provenance-bearing.
            // eslint-disable-next-line react/no-array-index-key
            <li key={`${repeatUnit.repeat_unit}-${repeatUnit.classification}-${index}`}>
              <code>{repeatUnit.repeat_unit}</code> — {repeatUnit.classification}
              {repeatUnit.repeat_unit === record.reference_repeat_unit ? ' (reference motif)' : ''}
            </li>
          ))}
        </MotifList>
      ) : (
        <p>No catalog repeat-unit labels are available.</p>
      )}

      {record.associated_diseases.length > 0 && (
        <>
          <h3>Associated diseases and short-read catalog ranges</h3>
          <p>
            Ranges below use the short-read catalog&apos;s repeat-unit-count definition and are
            copied from that catalog record.
          </p>
          <TableScroller>
            <ShortTandemRepeatAssociatedDiseasesTable
              associatedDiseases={record.associated_diseases}
              showSymbols
            />
          </TableScroller>
        </>
      )}

      <Disclaimer>
        <strong>Short-read known-locus ranges are reference context.</strong> They are not applied
        to long-read alleles, total allele length changes (ALT − REF, bp), genotypes, or
        individuals.
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

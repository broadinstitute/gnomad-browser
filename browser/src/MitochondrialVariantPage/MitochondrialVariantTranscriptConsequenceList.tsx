import React from 'react'
import styled from 'styled-components'

import { ListItem, OrderedList } from '@gnomad/ui'

import Link from '../Link'
import { getLabelForConsequenceTerm } from '../vepConsequences'
import { MitochondrialVariant } from './MitochondrialVariantPage'
import MitochondrialVariantTranscriptConsequence from './MitochondrialVariantTranscriptConsequence'
import { TranscriptConsequence } from '../VariantPage/VariantPage'

/**
 * Group a list of consequences by a field's value. Maintains sort order of list.
 */
const groupConsequences = (
  consequences: TranscriptConsequence[],
  key: 'major_consequence' | 'gene_id'
) => {
  const uniqueValues = consequences
    .map((csq) => csq[key])
    .filter((value, index, values) => index === values.indexOf(value))

  const groupedConsequences = consequences.reduce((acc, csq) => {
    const accKey = csq[key]
    if (accKey) {
      if (!acc[accKey]) {
        acc[accKey] = []
      }
      acc[accKey].push(csq)
    }
    return acc
  }, {} as Record<string, TranscriptConsequence[]>)

  return uniqueValues.map((value: any) => ({
    value,
    consequences: groupedConsequences[value],
  }))
}

type ConsequencesInGeneProps = {
  transcriptConsequences: any[]
  variant: any
}

const ConsequencesInGene = ({ transcriptConsequences, variant }: ConsequencesInGeneProps) => {
  return (
    // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
    <OrderedList>
      {transcriptConsequences.slice(0, 3).map((csq) => (
        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
        <ListItem key={csq.transcript_id}>
          <Link to={`/transcript/${csq.transcript_id}`}>
            {csq.transcript_id}.{csq.transcript_version}
          </Link>
          <MitochondrialVariantTranscriptConsequence consequence={csq} variant={variant} />
        </ListItem>
      ))}
    </OrderedList>
  )
}

const ConsequenceListWrapper = styled.ol`
  display: flex;
  flex-flow: row wrap;
  padding: 0;
  list-style-type: none;
  margin-bottom: 1em;

  h3,
  h4 {
    margin: 0 0 0.5em;
  }
`

const ConsequenceListItem = styled.li`
  margin-right: 2em;
`

type MitochondrialVariantTranscriptConsequenceListProps = {
  variant: MitochondrialVariant
}

const MitochondrialVariantTranscriptConsequenceList = ({
  variant,
}: MitochondrialVariantTranscriptConsequenceListProps) => (
  <ConsequenceListWrapper>
    {groupConsequences(variant.transcript_consequences, 'major_consequence').map(
      ({ value: consequenceTerm, consequences }: any) => (
        <ConsequenceListItem key={consequenceTerm}>
          <h3>{getLabelForConsequenceTerm(consequenceTerm)}</h3>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <OrderedList>
            {groupConsequences(consequences, 'gene_id').map(
              ({ value: geneId, consequences: consequencesInGene }) => {
                const geneSymbol = consequencesInGene[0].gene_symbol
                return (
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                  <ListItem key={geneId}>
                    <h4>
                      <Link to={`/gene/${geneId}`}>{geneSymbol}</Link>
                    </h4>
                    <ConsequencesInGene
                      transcriptConsequences={consequencesInGene}
                      variant={variant}
                    />
                  </ListItem>
                )
              }
            )}
          </OrderedList>
        </ConsequenceListItem>
      )
    )}
  </ConsequenceListWrapper>
)

export default MitochondrialVariantTranscriptConsequenceList

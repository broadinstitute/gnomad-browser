import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ListItem, OrderedList } from '@broad/ui'
import { getLabelForConsequenceTerm } from '@broad/utilities'

import Link from '../Link'
import TranscriptConsequenceDetails from './TranscriptConsequenceDetails'

/**
 * Group a list of consequences by a field's value. Maintains sort order of list.
 */
const groupConsequences = (consequences, key) => {
  const uniqueValues = consequences
    .map(csq => csq[key])
    .filter((value, index, values) => index === values.indexOf(value))

  const groupedConsequences = consequences.reduce((acc, csq) => {
    if (!acc[csq[key]]) {
      acc[csq[key]] = []
    }
    acc[csq[key]].push(csq)
    return acc
  }, {})

  return uniqueValues.map(value => ({
    value,
    consequences: groupedConsequences[value],
  }))
}

const TranscriptConsequenceListContainer = styled.ol`
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

const TranscriptConsequenceListItem = styled.li`
  flex-basis: 250px;
`

export const TranscriptConsequenceList = ({ sortedTranscriptConsequences }) => (
  <TranscriptConsequenceListContainer>
    {groupConsequences(sortedTranscriptConsequences, 'major_consequence').map(
      ({ value: consequenceTerm, consequences }) => (
        <TranscriptConsequenceListItem key={consequenceTerm}>
          <h3>{getLabelForConsequenceTerm(consequenceTerm)}</h3>
          <OrderedList>
            {groupConsequences(consequences, 'gene_id').map(
              ({ value: geneId, consequences: consequencesInGene }) => {
                const geneSymbol = consequencesInGene[0].gene_symbol
                return (
                  <ListItem key={geneId}>
                    <h4>
                      <Link to={`/gene/${geneId}`}>{geneSymbol}</Link>
                    </h4>
                    <OrderedList>
                      {consequencesInGene.map(csq => (
                        <ListItem key={csq.transcript_id}>
                          <Link to={`/gene/${geneId}/transcript/${csq.transcript_id}`}>
                            {csq.transcript_id}
                            {csq.canonical && ' *'}
                          </Link>
                          <br />
                          <TranscriptConsequenceDetails consequence={csq} />
                        </ListItem>
                      ))}
                    </OrderedList>
                  </ListItem>
                )
              }
            )}
          </OrderedList>
        </TranscriptConsequenceListItem>
      )
    )}
  </TranscriptConsequenceListContainer>
)

TranscriptConsequenceList.propTypes = {
  sortedTranscriptConsequences: PropTypes.arrayOf(
    PropTypes.shape({
      biotype: PropTypes.string,
      consequence_terms: PropTypes.arrayOf(PropTypes.string),
      gene_id: PropTypes.string.isRequired,
      gene_symbol: PropTypes.string.isRequired,
      hgvs: PropTypes.string,
      hgvsc: PropTypes.string,
      hgvsp: PropTypes.string,
      lof: PropTypes.string,
      lof_flags: PropTypes.string,
      lof_filter: PropTypes.string,
      major_consequence: PropTypes.string,
      transcript_id: PropTypes.string.isRequired,
    })
  ).isRequired,
}

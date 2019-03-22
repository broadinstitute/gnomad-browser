import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { ListItem, Modal, OrderedList, TextButton } from '@broad/ui'
import { getLabelForConsequenceTerm } from '@broad/utilities'

import Link from '../Link'
import TranscriptConsequence from './TranscriptConsequence'
import TranscriptConsequencePropType from './TranscriptConsequencePropType'

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

class ConsequencesInGene extends Component {
  static propTypes = {
    transcriptConsequences: PropTypes.arrayOf(TranscriptConsequencePropType).isRequired,
  }

  state = {
    isExpanded: false,
  }

  render() {
    const { transcriptConsequences } = this.props
    const { isExpanded } = this.state

    const {
      gene_symbol: geneSymbol,
      major_consequence: consequenceTerm,
    } = transcriptConsequences[0]

    return (
      <OrderedList>
        {transcriptConsequences.slice(0, 3).map(csq => (
          <ListItem key={csq.transcript_id}>
            <TranscriptConsequence consequence={csq} />
          </ListItem>
        ))}
        {transcriptConsequences.length > 3 && (
          <ListItem>
            <TextButton
              onClick={() => {
                this.setState({ isExpanded: true })
              }}
            >
              and {transcriptConsequences.length - 3} more
            </TextButton>
          </ListItem>
        )}
        {isExpanded && (
          <Modal
            initialFocusOnButton={false}
            onRequestClose={() => {
              this.setState({ isExpanded: false })
            }}
            title={`${getLabelForConsequenceTerm(consequenceTerm)} consequences in ${geneSymbol}`}
          >
            <OrderedList>
              {transcriptConsequences.map(csq => (
                <ListItem key={csq.transcript_id}>
                  <TranscriptConsequence consequence={csq} />
                </ListItem>
              ))}
            </OrderedList>
          </Modal>
        )}
      </OrderedList>
    )
  }
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
  flex-basis: 250px;
`

export const TranscriptConsequenceList = ({ sortedTranscriptConsequences }) => (
  <ConsequenceListWrapper>
    {groupConsequences(sortedTranscriptConsequences, 'major_consequence').map(
      ({ value: consequenceTerm, consequences }) => (
        <ConsequenceListItem key={consequenceTerm}>
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
                    <ConsequencesInGene transcriptConsequences={consequencesInGene} />
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

TranscriptConsequenceList.propTypes = {
  sortedTranscriptConsequences: PropTypes.arrayOf(TranscriptConsequencePropType).isRequired,
}

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { ExternalLink, ListItem, Modal, OrderedList, TextButton } from '@gnomad/ui'

import Link from '../Link'
import { getLabelForConsequenceTerm } from '../vepConsequences'
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

const TranscriptInfoWrapper = styled.div`
  margin-top: 0.25em;
`

const TranscriptInfo = ({ transcriptConsequence }) => {
  if (transcriptConsequence.is_mane_select) {
    if (transcriptConsequence.is_mane_select_version) {
      return (
        <TranscriptInfoWrapper>
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">MANE</ExternalLink> Select
          transcript for {transcriptConsequence.gene_symbol}
        </TranscriptInfoWrapper>
      )
    }

    return (
      <TranscriptInfoWrapper>
        Different version of{' '}
        <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">MANE</ExternalLink> Select
        transcript for {transcriptConsequence.gene_symbol}
      </TranscriptInfoWrapper>
    )
  }

  if (transcriptConsequence.is_canonical) {
    return (
      <TranscriptInfoWrapper>
        Ensembl canonical transcript for {transcriptConsequence.gene_symbol}
      </TranscriptInfoWrapper>
    )
  }

  return null
}

TranscriptInfo.propTypes = {
  transcriptConsequence: TranscriptConsequencePropType.isRequired,
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
            <Link to={`/transcript/${csq.transcript_id}`}>
              {csq.transcript_id}.{csq.transcript_version}
            </Link>
            <TranscriptInfo transcriptConsequence={csq} />
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
                  <Link to={`/transcript/${csq.transcript_id}`}>
                    {csq.transcript_id}.{csq.transcript_version}
                  </Link>
                  <TranscriptInfo transcriptConsequence={csq} />
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
  margin-right: 2em;
`

export const TranscriptConsequenceList = ({ transcriptConsequences }) => (
  <ConsequenceListWrapper>
    {groupConsequences(transcriptConsequences, 'major_consequence').map(
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
  transcriptConsequences: PropTypes.arrayOf(TranscriptConsequencePropType).isRequired,
}

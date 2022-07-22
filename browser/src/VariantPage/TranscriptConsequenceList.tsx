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
const groupConsequences = (consequences: any, key: any) => {
  const uniqueValues = consequences
    .map((csq: any) => csq[key])
    .filter((value: any, index: any, values: any) => index === values.indexOf(value))

  const groupedConsequences = consequences.reduce((acc: any, csq: any) => {
    if (!acc[csq[key]]) {
      acc[csq[key]] = []
    }
    acc[csq[key]].push(csq)
    return acc
  }, {})

  return uniqueValues.map((value: any) => ({
    value,
    consequences: groupedConsequences[value],
  }))
}

const TranscriptInfoWrapper = styled.div`
  margin-top: 0.25em;
`

type TranscriptInfoProps = {
  transcriptConsequence: TranscriptConsequencePropType
}

const TranscriptInfo = ({ transcriptConsequence }: TranscriptInfoProps) => {
  if (transcriptConsequence.is_mane_select) {
    if (transcriptConsequence.is_mane_select_version) {
      return (
        <TranscriptInfoWrapper>
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">MANE</ExternalLink> Select
          transcript for {transcriptConsequence.gene_symbol}
        </TranscriptInfoWrapper>
      )
    }

    return (
      <TranscriptInfoWrapper>
        Different version of{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
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

type ConsequencesInGeneProps = {
  transcriptConsequences: TranscriptConsequencePropType[]
}

type ConsequencesInGeneState = any

class ConsequencesInGene extends Component<ConsequencesInGeneProps, ConsequencesInGeneState> {
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
      // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
      <OrderedList>
        {transcriptConsequences.slice(0, 3).map((csq) => (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <ListItem key={csq.transcript_id}>
            <Link to={`/transcript/${csq.transcript_id}`}>
              {csq.transcript_id}.{csq.transcript_version}
            </Link>
            <TranscriptInfo transcriptConsequence={csq} />
            <TranscriptConsequence consequence={csq} />
          </ListItem>
        ))}
        {transcriptConsequences.length > 3 && (
          // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
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
            // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; initialFocusOnButton: b... Remove this comment to see the full error message
            initialFocusOnButton={false}
            onRequestClose={() => {
              this.setState({ isExpanded: false })
            }}
            title={`${getLabelForConsequenceTerm(consequenceTerm)} consequences in ${geneSymbol}`}
          >
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <OrderedList>
              {transcriptConsequences.map((csq) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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

type TranscriptConsequenceListProps = {
  transcriptConsequences: TranscriptConsequencePropType[]
}

export const TranscriptConsequenceList = ({
  transcriptConsequences,
}: TranscriptConsequenceListProps) => (
  <ConsequenceListWrapper>
    {groupConsequences(transcriptConsequences, 'major_consequence').map(
      ({ value: consequenceTerm, consequences }: any) => (
        <ConsequenceListItem key={consequenceTerm}>
          <h3>{getLabelForConsequenceTerm(consequenceTerm)}</h3>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <OrderedList>
            {groupConsequences(consequences, 'gene_id').map(
              // @ts-expect-error TS(7031) FIXME: Binding element 'geneId' implicitly has an 'any' t... Remove this comment to see the full error message
              ({ value: geneId, consequences: consequencesInGene }) => {
                const geneSymbol = consequencesInGene[0].gene_symbol
                return (
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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

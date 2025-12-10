import React, { Component } from 'react'
import styled from 'styled-components'

import { ListItem, Modal, OrderedList, TextButton } from '@gnomad/ui'

import InfoButton from '../help/InfoButton'
import Link from '../Link'
import {
  svConsequenceCategories,
  svConsequenceLabels,
} from '../StructuralVariantList/structuralVariantConsequences'
import { StructuralVariant } from './StructuralVariantPage'

const Wrapper = styled.ol`
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
  flex-basis: 220px;
`

type Props = {
  variant: StructuralVariant
}

type State = any

class StructuralVariantConsequenceList extends Component<Props, State> {
  state = {
    expandedConsequence: null,
  }

  render() {
    const { variant } = this.props
    const { expandedConsequence } = this.state
    const consequences = variant.consequences || []
    return (
      <React.Fragment>
        <Wrapper>
          {consequences.map((consequence) => {
            const consequenceCode = consequence.consequence
            const genes = consequence.genes || []

            const category = svConsequenceCategories[consequenceCode]

            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            const helpTopic = {
              lof: 'sv-effect_pLoF',
              dup_lof: 'sv-effect_IED',
              copy_gain: 'sv-effect_CG',
            }[category]

            return (
              <ConsequenceListItem key={consequenceCode}>
                <h3>
                  {svConsequenceLabels[consequenceCode]}{' '}
                  {!!helpTopic && <InfoButton topic={helpTopic} />}
                </h3>
                <OrderedList>
                  {genes.slice(0, 3).map((gene) => (
                    <ListItem key={gene}>
                      <Link to={`/gene/${gene}`}>{gene}</Link>
                    </ListItem>
                  ))}
                  {genes.length > 3 && (
                    <ListItem>
                      <TextButton
                        onClick={() => {
                          this.setState({ expandedConsequence: consequenceCode })
                        }}
                      >
                        and {genes.length - 3} more
                      </TextButton>
                    </ListItem>
                  )}
                </OrderedList>
              </ConsequenceListItem>
            )
          })}
        </Wrapper>
        {expandedConsequence && (
          // @ts-expect-error TS(2741) FIXME: Property 'size' is missing in type '{ children: El... Remove this comment to see the full error message
          <Modal
            title={`${svConsequenceLabels[expandedConsequence]}`}
            onRequestClose={() => {
              this.setState({ expandedConsequence: null })
            }}
          >
            <OrderedList>
              {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
              {variant.consequences
                .find(({ consequence }: any) => consequence === expandedConsequence)
                .genes.map((gene: any) => (
                  <ListItem key={gene}>
                    <Link to={`/gene/${gene}`}>{gene}</Link>
                  </ListItem>
                ))}
            </OrderedList>
          </Modal>
        )}
      </React.Fragment>
    )
  }
}

export default StructuralVariantConsequenceList

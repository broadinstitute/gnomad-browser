import React, { Component } from 'react'
import styled from 'styled-components'

import { ListItem, Modal, OrderedList, TextButton } from '@gnomad/ui'

import InfoButton from '../help/InfoButton'
import Link from '../Link'
import {
  svConsequenceCategories,
  svConsequenceLabels,
} from '../StructuralVariantList/structuralVariantConsequences'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

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
  variant: StructuralVariantDetailPropType
}

type State = any

class StructuralVariantConsequenceList extends Component<Props, State> {
  state = {
    expandedConsequence: null,
  }

  render() {
    const { variant } = this.props
    const { expandedConsequence } = this.state

    return (
      <React.Fragment>
        <Wrapper>
          {variant.consequences.map(({ consequence, genes }) => {
            const category = svConsequenceCategories[consequence]

            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            const helpTopic = {
              lof: 'sv-effect_pLoF',
              dup_lof: 'sv-effect_IED',
              copy_gain: 'sv-effect_CG',
            }[category]

            return (
              <ConsequenceListItem key={consequence}>
                <h3>
                  {svConsequenceLabels[consequence]}{' '}
                  {!!helpTopic && <InfoButton topic={helpTopic} />}
                </h3>
                {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
                <OrderedList>
                  {genes.slice(0, 3).map((gene) => (
                    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                    <ListItem key={gene}>
                      <Link to={`/gene/${gene}`}>{gene}</Link>
                    </ListItem>
                  ))}
                  {genes.length > 3 && (
                    // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
                    <ListItem>
                      <TextButton
                        onClick={() => {
                          this.setState({ expandedConsequence: consequence })
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
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <OrderedList>
              {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
              {variant.consequences
                .find(({ consequence }: any) => consequence === expandedConsequence)
                .genes.map((gene: any) => (
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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

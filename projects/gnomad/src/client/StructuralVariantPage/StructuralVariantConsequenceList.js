import React, { Component } from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { ListItem, Modal, OrderedList, TextButton } from '@broad/ui'

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

class StructuralVariantConsequenceList extends Component {
  static propTypes = {
    variant: StructuralVariantDetailPropType.isRequired,
  }

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

            const helpTopic = {
              lof: 'sv-effect_pLoF',
              dup_lof: 'sv-effect_IED',
              copy_gain: 'sv-effect_CG',
            }[category]

            return (
              <ConsequenceListItem key={consequence}>
                <h3>
                  {svConsequenceLabels[consequence]}{' '}
                  {!!helpTopic && <QuestionMark topic={`SV_docs/${helpTopic}`} />}
                </h3>
                <OrderedList>
                  {genes.slice(0, 3).map(gene => (
                    <ListItem key={gene}>
                      <Link to={`/gene/${gene}`}>{gene}</Link>
                    </ListItem>
                  ))}
                  {genes.length > 3 && (
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
          <Modal
            title={`${svConsequenceLabels[expandedConsequence]}`}
            onRequestClose={() => {
              this.setState({ expandedConsequence: null })
            }}
          >
            <OrderedList>
              {variant.consequences
                .find(({ consequence }) => consequence === expandedConsequence)
                .genes.map(gene => (
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

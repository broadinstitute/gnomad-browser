import React, { Component } from 'react'
import styled from 'styled-components'

import { InfoModal, ListItem, OrderedList, TextButton } from '@broad/ui'

import Link from '../Link'
import { svConsequenceLabels } from '../StructuralVariantList/structuralVariantConsequences'
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
          {variant.consequences.map(({ consequence, genes }) => (
            <ConsequenceListItem key={consequence}>
              <h3>{svConsequenceLabels[consequence]}</h3>
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
          ))}
        </Wrapper>
        {expandedConsequence && (
          <InfoModal
            title={`${svConsequenceLabels[expandedConsequence]}`}
            onRequestClose={() => {
              this.setState({ expandedConsequence: null })
            }}
            width="50%"
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
          </InfoModal>
        )}
      </React.Fragment>
    )
  }
}

export default StructuralVariantConsequenceList

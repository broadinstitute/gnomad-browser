import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Badge, List, ListItem, Modal, TextButton } from '@broad/ui'

import Link from '../Link'
import StatusMessage from '../StatusMessage'
import MNVConsequence from './MultiNucleotideVariant/MNVConsequence'
import MNVDetailsQuery from './MultiNucleotideVariant/MNVDetailsQuery'

class GnomadMultiNucleotideVariantsSection extends Component {
  static propTypes = {
    multiNucleotideVariants: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string.isRequired,
        combinedVariantId: PropTypes.string.isRequired,
        nIndividuals: PropTypes.number.isRequired,
        otherVariantId: PropTypes.string.isRequired,
      })
    ).isRequired,
  }

  state = {
    selectedMNV: null,
  }

  renderModal() {
    const { selectedMNV } = this.state
    const { combinedVariantId } = selectedMNV

    return (
      <Modal
        onRequestClose={() => {
          this.setState({ selectedMNV: null })
        }}
        size="large"
        title="Multi-Nucleotide Variant"
      >
        <MNVDetailsQuery variantId={combinedVariantId}>
          {({ data, error, loading }) => {
            if (loading) {
              return <StatusMessage>Loading variant...</StatusMessage>
            }

            if (error || !data.multiNucleotideVariant) {
              return <StatusMessage>Unable to load variant</StatusMessage>
            }

            const variant = data.multiNucleotideVariant

            const thisVariant =
              selectedMNV.otherVariantId === variant.snv1.variantId ? 'snv2' : 'snv1'
            const otherVariant = thisVariant === 'snv1' ? 'snv2' : 'snv1'

            const nIndividualsInExome = variant.exome ? variant.exome.nIndividuals : 0
            const nIndividualsInGenome = variant.genome ? variant.genome.nIndividuals : 0
            const totalIndividuals = nIndividualsInExome + nIndividualsInGenome

            return (
              <div>
                <p style={{ marginTop: 0 }}>
                  {variant[thisVariant].variantId} is found in phase with{' '}
                  {variant[otherVariant].variantId} in {totalIndividuals} individuals.
                </p>
                <MNVConsequence
                  consequence={variant.consequences[0]}
                  snv1={variant.snv1.variantId}
                  snv2={variant.snv2.variantId}
                />
              </div>
            )
          }}
        </MNVDetailsQuery>
      </Modal>
    )
  }

  render() {
    const { multiNucleotideVariants } = this.props
    const { selectedMNV } = this.state

    return (
      <div>
        <p>
          <strong>This variant&apos;s consequence may be affected by other variants:</strong>
        </p>
        <List>
          {multiNucleotideVariants.map(mnv => {
            const { category, nIndividuals, otherVariantId } = mnv
            return (
              <ListItem key={otherVariantId}>
                {category === 'Unchanged' ? (
                  <Badge level="info">Note</Badge>
                ) : (
                  <Badge level="warning">Warning</Badge>
                )}{' '}
                This variant is found in phase with{' '}
                <Link to={`/variant/${otherVariantId}`}>{otherVariantId}</Link> in {nIndividuals}{' '}
                individual(s)
                {category !== 'Unchanged' && ', altering its functional interpretation'}.{' '}
                <TextButton
                  disabled={selectedMNV}
                  onClick={() => this.setState({ selectedMNV: mnv })}
                >
                  More info
                </TextButton>
              </ListItem>
            )
          })}
        </List>

        {selectedMNV && this.renderModal()}
      </div>
    )
  }
}

export default GnomadMultiNucleotideVariantsSection

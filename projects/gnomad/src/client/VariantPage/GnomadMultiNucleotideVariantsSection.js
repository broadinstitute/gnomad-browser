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
        category: PropTypes.string,
        combined_variant_id: PropTypes.string.isRequired,
        n_individuals: PropTypes.number.isRequired,
        other_constituent_snvs: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ).isRequired,
  }

  state = {
    selectedMNV: null,
  }

  renderModal() {
    const { selectedMNV } = this.state

    return (
      <Modal
        onRequestClose={() => {
          this.setState({ selectedMNV: null })
        }}
        size="large"
        title="Multi-Nucleotide Variant"
      >
        <MNVDetailsQuery variantId={selectedMNV.combined_variant_id}>
          {({ data, error, loading }) => {
            if (loading) {
              return <StatusMessage>Loading variant...</StatusMessage>
            }

            if (error || !data.multiNucleotideVariant) {
              return <StatusMessage>Unable to load variant</StatusMessage>
            }

            const variant = data.multiNucleotideVariant

            const thisVariantId = variant.constituent_snvs
              .map(snv => snv.variant_id)
              .find(snv => !selectedMNV.other_constituent_snvs.includes(snv))

            const nIndividualsInExome = variant.exome ? variant.exome.n_individuals : 0
            const nIndividualsInGenome = variant.genome ? variant.genome.n_individuals : 0
            const totalIndividuals = nIndividualsInExome + nIndividualsInGenome

            return (
              <div>
                <p style={{ marginTop: 0 }}>
                  {thisVariantId} is found in phase with{' '}
                  {selectedMNV.other_constituent_snvs.join(' and ')} in {totalIndividuals}{' '}
                  individuals.
                </p>
                <MNVConsequence consequence={variant.consequences[0]} />
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
          {multiNucleotideVariants.map(mnv => (
            <ListItem key={mnv.combined_variant_id}>
              {mnv.category === null || mnv.category === 'Unchanged' ? (
                <Badge level="info">Note</Badge>
              ) : (
                <Badge level="warning">Warning</Badge>
              )}{' '}
              This variant is found in phase with{' '}
              {mnv.other_constituent_snvs
                .map(snv => (
                  <Link key={snv} to={`/variant/${snv}`}>
                    {snv}
                  </Link>
                ))
                .reduce((acc, el) => (acc ? [...acc, ' and ', el] : [el]), null)}{' '}
              in {mnv.n_individuals} individual{mnv.individuals !== 1 && 's'}
              {mnv.category !== null &&
                mnv.category !== 'Unchanged' &&
                ', altering its functional interpretation'}
              .{' '}
              <TextButton
                disabled={selectedMNV}
                onClick={() => this.setState({ selectedMNV: mnv })}
              >
                More info
              </TextButton>
            </ListItem>
          ))}
        </List>

        {selectedMNV && this.renderModal()}
      </div>
    )
  }
}

export default GnomadMultiNucleotideVariantsSection

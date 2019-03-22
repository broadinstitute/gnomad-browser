import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Badge, BaseTable, Modal, TextButton } from '@broad/ui'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

import Link from '../Link'

const MNVList = styled.ul`
  li {
    margin-bottom: 0.5em;
  }
`

const categoryColors = {
  lof: '#DD2C00',
  missense: 'orange',
  synonymous: '#2E7D32',
  other: '#424242',
}

const getConsequenceColor = consequenceTerm => {
  if (!consequenceTerm) {
    return 'gray'
  }
  const category = getCategoryFromConsequence(consequenceTerm) || 'other'
  return categoryColors[category]
}

class GnomadMultiNucleotideVariantsSection extends Component {
  static propTypes = {
    multiNucleotideVariants: PropTypes.arrayOf(
      PropTypes.shape({
        ac: PropTypes.number.isRequired,
        category: PropTypes.string.isRequired,
        mnvAminoAcidChange: PropTypes.string.isRequired,
        mnvCodonChange: PropTypes.string.isRequired,
        mnvConsequence: PropTypes.string.isRequired,
        otherVariantId: PropTypes.string.isRequired,
        otherAminoAcidChange: PropTypes.string.isRequired,
        otherCodonChange: PropTypes.string.isRequired,
        otherConsequence: PropTypes.string.isRequired,
        snvAminoAcidChange: PropTypes.string.isRequired,
        snvCodonChange: PropTypes.string.isRequired,
        snvConsequence: PropTypes.string.isRequired,
      })
    ).isRequired,
    thisVariantId: PropTypes.string.isRequired,
  }

  state = {
    selectedMNV: null,
  }

  renderModal() {
    const { thisVariantId } = this.props
    const { selectedMNV } = this.state
    const {
      ac,
      category,
      mnvAminoAcidChange,
      mnvCodonChange,
      mnvConsequence,
      otherVariantId,
      otherAminoAcidChange,
      otherCodonChange,
      otherConsequence,
      snvAminoAcidChange,
      snvCodonChange,
      snvConsequence,
    } = selectedMNV

    return (
      <Modal
        onRequestClose={() => {
          this.setState({ selectedMNV: null })
        }}
        size="large"
        title="Multi-Nucleotide Variant"
      >
        <p style={{ marginTop: 0 }}>
          {thisVariantId} is found in phase with {otherVariantId} in {ac} individuals.
        </p>
        <p>
          <strong>Category:</strong> {category}
        </p>
        <BaseTable>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Consequence</th>
              <th>Codon Change</th>
              <th>Amino Acid Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{thisVariantId}</td>
              <td>
                <span style={{ color: getConsequenceColor(snvConsequence) }}>
                  {getLabelForConsequenceTerm(snvConsequence)}
                </span>
              </td>
              <td>{snvCodonChange}</td>
              <td>{snvAminoAcidChange}</td>
            </tr>
            <tr>
              <td>{otherVariantId}</td>
              <td>
                <span style={{ color: getConsequenceColor(otherConsequence) }}>
                  {getLabelForConsequenceTerm(otherConsequence)}
                </span>
              </td>
              <td>{otherCodonChange}</td>
              <td>{otherAminoAcidChange}</td>
            </tr>
            <tr>
              <td>Combined</td>
              <td>
                <span style={{ color: getConsequenceColor(mnvConsequence) }}>
                  {getLabelForConsequenceTerm(mnvConsequence)}
                </span>
              </td>
              <td>{mnvCodonChange}</td>
              <td>{mnvAminoAcidChange}</td>
            </tr>
          </tbody>
        </BaseTable>
      </Modal>
    )
  }

  render() {
    const { multiNucleotideVariants } = this.props
    const { selectedMNV } = this.state

    if (multiNucleotideVariants.length === 0) {
      return null
    }

    return (
      <div>
        <p>
          <strong>This variant&apos;s consequence may be affected by other variants:</strong>
        </p>
        <MNVList>
          {multiNucleotideVariants.map(mnv => {
            const { ac, category, otherVariantId } = mnv
            return (
              <li key={otherVariantId}>
                {category === 'Unchanged' ? (
                  <Badge level="info">Note</Badge>
                ) : (
                  <Badge level="warning">Warning</Badge>
                )}{' '}
                This variant is found in phase with{' '}
                <Link to={`/variant/${otherVariantId}`}>{otherVariantId}</Link> in {ac}{' '}
                individual(s)
                {category !== 'Unchanged' && ', altering its functional interpretation'}.{' '}
                <TextButton
                  disabled={selectedMNV}
                  onClick={() => this.setState({ selectedMNV: mnv })}
                >
                  More info
                </TextButton>
              </li>
            )
          })}
        </MNVList>

        {selectedMNV && this.renderModal()}
      </div>
    )
  }
}

export default GnomadMultiNucleotideVariantsSection

import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@broad/ui'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

import VariantCategoryMarker from '../../VariantList/VariantCategoryMarker'

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

export const MNVConsequencePropType = PropTypes.shape({
  snv1: PropTypes.shape({
    aminoAcidChange: PropTypes.string.isRequired,
    codonChange: PropTypes.string.isRequired,
    consequence: PropTypes.string.isRequired,
  }).isRequired,
  snv2: PropTypes.shape({
    aminoAcidChange: PropTypes.string.isRequired,
    codonChange: PropTypes.string.isRequired,
    consequence: PropTypes.string.isRequired,
  }).isRequired,
  mnv: PropTypes.shape({
    aminoAcidChange: PropTypes.string.isRequired,
    codonChange: PropTypes.string.isRequired,
    consequence: PropTypes.string.isRequired,
  }).isRequired,
  category: PropTypes.string.isRequired,
})

const MNVConsequence = ({ consequence, snv1, snv2 }) => {
  const {
    category,
    snv1: snv1Consequence,
    snv2: snv2Consequence,
    mnv: mnvConsequence,
  } = consequence

  return (
    <div>
      <p>
        <strong>Category:</strong> {category}
      </p>
      <BaseTable>
        <thead>
          <tr>
            <th scope="col">Variant</th>
            <th scope="col">Consequence</th>
            <th scope="col">Codon Change</th>
            <th scope="col">Amino Acid Change</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{snv1}</th>
            <td>
              <VariantCategoryMarker color={getConsequenceColor(snv1Consequence.consequence)} />
              {getLabelForConsequenceTerm(snv1Consequence.consequence)}
            </td>
            <td>{snv1Consequence.codonChange.replace('/', ' → ')}</td>
            <td>{snv1Consequence.aminoAcidChange.replace('/', ' → ')}</td>
          </tr>
          <tr>
            <th scope="row">{snv2}</th>
            <td>
              <VariantCategoryMarker color={getConsequenceColor(snv2Consequence.consequence)} />
              {getLabelForConsequenceTerm(snv2Consequence.consequence)}
            </td>
            <td>{snv2Consequence.codonChange.replace('/', ' → ')}</td>
            <td>{snv2Consequence.aminoAcidChange.replace('/', ' → ')}</td>
          </tr>
          <tr>
            <th scope="row">Combined</th>
            <td>
              <VariantCategoryMarker color={getConsequenceColor(mnvConsequence.consequence)} />
              {getLabelForConsequenceTerm(mnvConsequence.consequence)}
            </td>
            <td>{mnvConsequence.codonChange.replace('/', ' → ')}</td>
            <td>{mnvConsequence.aminoAcidChange.replace('/', ' → ')}</td>
          </tr>
        </tbody>
      </BaseTable>
    </div>
  )
}

MNVConsequence.propTypes = {
  consequence: MNVConsequencePropType.isRequired,
  snv1: PropTypes.string.isRequired,
  snv2: PropTypes.string.isRequired,
}

export default MNVConsequence

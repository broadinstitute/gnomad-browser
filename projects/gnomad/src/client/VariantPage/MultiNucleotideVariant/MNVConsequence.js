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
  category: PropTypes.string,
  consequence: PropTypes.string.isRequired,
  codons: PropTypes.string.isRequired,
  amino_acids: PropTypes.string.isRequired,
  snv_consequences: PropTypes.arrayOf(
    PropTypes.shape({
      variant_id: PropTypes.shape.isRequired,
      consequence: PropTypes.string.isRequired,
      codons: PropTypes.string.isRequired,
      amino_acids: PropTypes.string.isRequired,
    })
  ),
})

const MNVConsequence = ({ consequence }) => (
  <div>
    {consequence.category && (
      <p>
        <strong>Category:</strong> {consequence.category}
      </p>
    )}
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
        {consequence.snv_consequences.map(snvConsequence => (
          <tr key={snvConsequence.variant_id}>
            <th scope="row">{snvConsequence.variant_id}</th>
            <td>
              <VariantCategoryMarker color={getConsequenceColor(snvConsequence.consequence)} />
              {getLabelForConsequenceTerm(snvConsequence.consequence)}
            </td>
            <td>{snvConsequence.codons.replace('/', ' → ')}</td>
            <td>{snvConsequence.amino_acids.replace('/', ' → ')}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">Combined</th>
          <td>
            <VariantCategoryMarker color={getConsequenceColor(consequence.consequence)} />
            {getLabelForConsequenceTerm(consequence.consequence)}
          </td>
          <td>{consequence.codons.replace('/', ' → ')}</td>
          <td>{consequence.amino_acids.replace('/', ' → ')}</td>
        </tr>
      </tbody>
    </BaseTable>
  </div>
)

MNVConsequence.propTypes = {
  consequence: MNVConsequencePropType.isRequired,
}

export default MNVConsequence

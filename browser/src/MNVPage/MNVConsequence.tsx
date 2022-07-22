import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@gnomad/ui'

import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '../vepConsequences'
import VariantCategoryMarker from '../VariantList/VariantCategoryMarker'

const categoryColors = {
  lof: '#DD2C00',
  missense: 'orange',
  synonymous: '#2E7D32',
  other: '#424242',
}

const getConsequenceColor = (consequenceTerm: any) => {
  if (!consequenceTerm) {
    return 'gray'
  }
  const category = getCategoryFromConsequence(consequenceTerm) || 'other'
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  return categoryColors[category]
}

type MNVConsequencePropType = {
  category?: string
  consequence: string
  codons: string
  amino_acids: string
  snv_consequences?: {
    variant_id: any // TODO: PropTypes.shape
    consequence: string
    codons: string
    amino_acids: string
  }[]
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ category: Requireab... Remove this comment to see the full error message
const MNVConsequencePropType: PropTypes.Requireable<MNVConsequencePropType> = PropTypes.shape({
  category: PropTypes.string,
  consequence: PropTypes.string.isRequired,
  codons: PropTypes.string.isRequired,
  amino_acids: PropTypes.string.isRequired,
  snv_consequences: PropTypes.arrayOf(
    PropTypes.shape({
      variant_id: (PropTypes.shape as any).isRequired,
      consequence: PropTypes.string.isRequired,
      codons: PropTypes.string.isRequired,
      amino_acids: PropTypes.string.isRequired,
    })
  ),
})
export { MNVConsequencePropType }

type MNVConsequenceProps = {
  consequence: MNVConsequencePropType
}

const MNVConsequence = ({ consequence }: MNVConsequenceProps) => (
  <div>
    {consequence.category && (
      <p>
        <strong>Category:</strong> {consequence.category}
      </p>
    )}
    {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
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
        {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
        {consequence.snv_consequences.map((snvConsequence) => (
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

export default MNVConsequence

import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@broad/ui'

import AttributeList from '../../AttributeList'
import QCFilter from '../../QCFilter'

const ExacVariantAttributeList = ({ variant }) => (
  <AttributeList labelWidth={120} style={{ marginTop: '1.25em' }}>
    <AttributeList.Item label="Filter">
      {variant.filters.length > 0 ? (
        variant.filters.map(filter => <QCFilter key={filter} filter={filter} />)
      ) : (
        <Badge level="success">Pass</Badge>
      )}
    </AttributeList.Item>
    <AttributeList.Item label="Allele Count">{variant.ac}</AttributeList.Item>
    <AttributeList.Item label="Allele Number">{variant.an}</AttributeList.Item>
    <AttributeList.Item label="Allele Frequency">
      {(variant.an === 0 ? 0 : variant.ac / variant.an).toPrecision(4)}
    </AttributeList.Item>
  </AttributeList>
)

ExacVariantAttributeList.propTypes = {
  variant: PropTypes.shape({
    ac: PropTypes.number.isRequired,
    an: PropTypes.number.isRequired,
    filters: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
}

export default ExacVariantAttributeList

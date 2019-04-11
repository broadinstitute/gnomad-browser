import PropTypes from 'prop-types'
import React from 'react'

import { ListItem, OrderedList } from '@broad/ui'

import Link from '../../Link'
import MNVConsequence, { MNVConsequencePropType } from './MNVConsequence'

/**
 * Group a list of consequences by a field's value. Maintains sort order of list.
 */
const groupValues = (values, key) => {
  const uniqueValues = values
    .map(csq => csq[key])
    .filter((value, index, allValues) => index === allValues.indexOf(value))

  const groupedValues = values.reduce((acc, csq) => {
    if (!acc[csq[key]]) {
      acc[csq[key]] = []
    }
    acc[csq[key]].push(csq)
    return acc
  }, {})

  return uniqueValues.map(value => ({
    key: value,
    group: groupedValues[value],
  }))
}

const MNVConsequenceList = ({ variant }) => (
  <OrderedList>
    {groupValues(variant.consequences, 'gene_id').map(({ key: geneId, group }) => (
      <ListItem key={geneId}>
        <h4>
          <Link to={`/gene/${geneId}`}>{group[0].gene_name}</Link>
        </h4>
        <OrderedList>
          {group.map(consequence => (
            <ListItem key={consequence.transcript_id}>
              <Link to={`/gene/${geneId}/transcript/${consequence.transcript_id}`}>
                {consequence.transcript_id}
              </Link>
              <MNVConsequence consequence={consequence} />
            </ListItem>
          ))}
        </OrderedList>
      </ListItem>
    ))}
  </OrderedList>
)

MNVConsequenceList.propTypes = {
  variant: PropTypes.shape({
    consequences: PropTypes.arrayOf(MNVConsequencePropType).isRequired,
  }).isRequired,
}

export default MNVConsequenceList

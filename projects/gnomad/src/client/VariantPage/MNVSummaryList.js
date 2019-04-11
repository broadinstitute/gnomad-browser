import PropTypes from 'prop-types'
import React from 'react'

import { Badge, List, ListItem } from '@broad/ui'

import Link from '../Link'

const MNVSummaryList = ({ multiNucleotideVariants }) => (
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
        . <Link to={`/variant/${mnv.combined_variant_id}`}>More info</Link>
      </ListItem>
    ))}
  </List>
)

MNVSummaryList.propTypes = {
  multiNucleotideVariants: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      combined_variant_id: PropTypes.string.isRequired,
      n_individuals: PropTypes.number.isRequired,
      other_constituent_snvs: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
}

export default MNVSummaryList

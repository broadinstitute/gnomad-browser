import PropTypes from 'prop-types'
import React from 'react'

import { Badge, List, ListItem } from '@broad/ui'

import Link from '../../Link'

const MNVSummaryList = ({ multiNucleotideVariants }) => (
  <List>
    {multiNucleotideVariants.map(mnv => (
      <ListItem key={mnv.combined_variant_id}>
        {mnv.changes_amino_acids ? (
          <Badge level="warning">Warning</Badge>
        ) : (
          <Badge level="info">Note</Badge>
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
        {mnv.changes_amino_acids && ', altering the amino acid sequence'}.{' '}
        <Link to={`/variant/${mnv.combined_variant_id}`}>More info</Link>
      </ListItem>
    ))}
  </List>
)

MNVSummaryList.propTypes = {
  multiNucleotideVariants: PropTypes.arrayOf(
    PropTypes.shape({
      changes_amino_acids: PropTypes.bool.isRequired,
      combined_variant_id: PropTypes.string.isRequired,
      n_individuals: PropTypes.number.isRequired,
      other_constituent_snvs: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
}

export default MNVSummaryList

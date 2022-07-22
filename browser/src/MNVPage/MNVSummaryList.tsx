import React from 'react'

import { Badge, List, ListItem } from '@gnomad/ui'

import Link from '../Link'

type Props = {
  multiNucleotideVariants: {
    changes_amino_acids: boolean
    combined_variant_id: string
    n_individuals: number
    other_constituent_snvs: string[]
  }[]
}

const MNVSummaryList = ({ multiNucleotideVariants }: Props) => (
  // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
  <List>
    {multiNucleotideVariants.map((mnv) => (
      // @ts-expect-error TS(2769) FIXME: No overload matches this call.
      <ListItem key={mnv.combined_variant_id}>
        {mnv.changes_amino_acids ? (
          <Badge level="warning">Warning</Badge>
        ) : (
          <Badge level="info">Note</Badge>
        )}{' '}
        This variant is found in phase with{' '}
        {mnv.other_constituent_snvs
          .map((snv) => (
            <Link key={snv} to={`/variant/${snv}`}>
              {snv}
            </Link>
          ))
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          .reduce((acc, el) => (acc ? [...acc, ' and ', el] : [el]), null)}{' '}
        {/* @ts-expect-error TS(2551) FIXME: Property 'individuals' does not exist on type '{ c... Remove this comment to see the full error message */}
        in {mnv.n_individuals} individual{mnv.individuals !== 1 && 's'}
        {mnv.changes_amino_acids && ', altering the amino acid sequence'}.{' '}
        <Link
          to={`/variant/${mnv.combined_variant_id}?dataset=gnomad_r2_1`}
          preserveSelectedDataset={false}
        >
          More info
        </Link>
      </ListItem>
    ))}
  </List>
)

export default MNVSummaryList

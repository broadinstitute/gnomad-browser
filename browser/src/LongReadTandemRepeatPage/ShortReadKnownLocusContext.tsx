import React from 'react'

import Link from '../Link'
import { LongReadTrShortReadContext } from './types'

type Props = {
  context: LongReadTrShortReadContext | null
}

const ShortReadKnownLocusContext = ({ context }: Props) => {
  if (
    context?.status !== 'EXACT_UNIQUE' ||
    !context.catalog_record ||
    context.matched_component_index == null ||
    !context.matched_component
  ) {
    return null
  }

  const record = context.catalog_record
  return (
    <Link
      to={`/short-tandem-repeat/${record.id}?dataset=gnomad_r4`}
      preserveSelectedDataset={false}
      title="Exact reference-component match; short-read catalog classifications are not applied to long-read alleles"
    >
      {record.id}
      {record.gene?.symbol ? ` (${record.gene.symbol})` : ''} short-read details
    </Link>
  )
}

export default ShortReadKnownLocusContext

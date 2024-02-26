import React from 'react'

import { Badge } from '@gnomad/ui'

import AttributeList, { AttributeListItem } from '../AttributeList'
import { MitochondrialVariant } from './MitochondrialVariantPage'

type Props = {
  variant: MitochondrialVariant
}

const MitochondrialVariantAttributeList = ({ variant }: Props) => (
  <AttributeList style={{ marginTop: '1.25em' }}>
    <AttributeListItem
      label="Filters"
      tooltip="Quality control filters that this variant failed (if any)"
    >
      {variant.filters && variant.filters.length ? (
        variant.filters.map((f: any) => (
          <Badge key={f} level="warning">
            {f}
          </Badge>
        ))
      ) : (
        <Badge level="success">Pass</Badge>
      )}
    </AttributeListItem>
    <AttributeListItem
      label="Allele Number"
      tooltip="Total number of individuals with high quality sequence at this position."
    >
      {variant.an}
    </AttributeListItem>
    <AttributeListItem
      label="Homoplasmic AC"
      tooltip="Number of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95)."
    >
      {variant.ac_hom}
    </AttributeListItem>
    <AttributeListItem
      label="Homoplasmic AF"
      tooltip="Proportion of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95)."
    >
      {variant.an === 0 ? 0 : (variant.ac_hom / variant.an).toPrecision(4)}
    </AttributeListItem>
    <AttributeListItem
      label="Heteroplasmic AC"
      tooltip="Number of individuals with a variant at heteroplasmy level 0.10 - 0.95."
    >
      {variant.ac_het}
    </AttributeListItem>
    <AttributeListItem
      label="Heteroplasmic AF"
      tooltip="Proportion of individuals with a variant at heteroplasmy level 0.10 - 0.95."
    >
      {variant.an === 0 ? 0 : (variant.ac_het / variant.an).toPrecision(4)}
    </AttributeListItem>
    {variant.max_heteroplasmy && (
      <AttributeListItem
        label="Max Observed Heteroplasmy"
        tooltip="Maximum heteroplasmy level observed across all individuals (range 0.10 - 1.00)."
      >
        {variant.max_heteroplasmy.toPrecision(4)}
      </AttributeListItem>
    )}
    <AttributeListItem
      label="Excluded Allele Count"
      tooltip="Number of individuals with a variant filtered out due to failing one of the genotype-level filters (heteroplasmy below 10%, base quality, position, strand bias, weak evidence, and/or contamination)."
    >
      {variant.excluded_ac}
    </AttributeListItem>
    <AttributeListItem
      label="Haplogroup Defining"
      tooltip="This variant is homoplasmic among individuals within at least one haplogroup listed in PhyloTree Build 17."
    >
      {variant.haplogroup_defining ? 'Yes' : 'No'}
    </AttributeListItem>
  </AttributeList>
)

export default MitochondrialVariantAttributeList

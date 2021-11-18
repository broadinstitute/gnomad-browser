import React from 'react'

import { Badge } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

const MitochondrialVariantAttributeList = ({ variant }) => (
  <AttributeList style={{ marginTop: '1.25em' }}>
    <AttributeList.Item
      label="Filters"
      tooltip="Quality control filters that this variant failed (if any)"
    >
      {variant.filters.length ? (
        variant.filters.map(f => (
          <Badge key={f} level="warning">
            {f}
          </Badge>
        ))
      ) : (
        <Badge level="success">Pass</Badge>
      )}
    </AttributeList.Item>
    <AttributeList.Item
      label="Allele Number"
      tooltip="Total number of individuals with high quality sequence at this position."
    >
      {variant.an}
    </AttributeList.Item>
    <AttributeList.Item
      label="Homoplasmic AC"
      tooltip="Number of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95)."
    >
      {variant.ac_hom}
    </AttributeList.Item>
    <AttributeList.Item
      label="Homoplasmic AF"
      tooltip="Proportion of individuals with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95)."
    >
      {variant.an === 0 ? 0 : (variant.ac_hom / variant.an).toPrecision(4)}
    </AttributeList.Item>
    <AttributeList.Item
      label="Heteroplasmic AC"
      tooltip="Number of individuals with a variant at heteroplasmy level 0.10 - 0.95."
    >
      {variant.ac_het}
    </AttributeList.Item>
    <AttributeList.Item
      label="Heteroplasmic AF"
      tooltip="Proportion of individuals with a variant at heteroplasmy level 0.10 - 0.95."
    >
      {variant.an === 0 ? 0 : (variant.ac_het / variant.an).toPrecision(4)}
    </AttributeList.Item>
    <AttributeList.Item
      label="Max Observed Heteroplasmy"
      tooltip="Maximum heteroplasmy level observed across all individuals (range 0.10 - 1.00)."
    >
      {variant.max_heteroplasmy.toPrecision(4)}
    </AttributeList.Item>
    <AttributeList.Item
      label="Excluded Allele Count"
      tooltip="Number of individuals with a variant (heteroplasmy 0.10 - 1.00) filtered out due to likely sequencing error, potential NUMT misalignment, or potential sample contamination."
    >
      {variant.excluded_ac}
    </AttributeList.Item>
    <AttributeList.Item
      label="Haplogroup Defining"
      tooltip="This variant is homoplasmic among individuals within at least one haplogroup listed in PhyloTree Build 17."
    >
      {variant.haplogroup_defining ? 'Yes' : 'No'}
    </AttributeList.Item>
  </AttributeList>
)

MitochondrialVariantAttributeList.propTypes = {
  variant: MitochondrialVariantDetailPropType.isRequired,
}

export default MitochondrialVariantAttributeList

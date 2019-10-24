import React, { useState } from 'react'

import { Select } from '@broad/ui'

import Histogram from '../Histogram'
import ControlSection from '../VariantPage/ControlSection'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const StructuralVariantAgeDistribution = ({ variant }) => {
  const [selectedSamples, setSelectedSamples] = useState('het') // 'het' or 'hom'

  const selectedAgeDistribution = variant.age_distribution[selectedSamples]

  return (
    <div>
      <Histogram
        barColor="#73ab3d"
        binEdges={selectedAgeDistribution.bin_edges}
        binValues={selectedAgeDistribution.bin_freq}
        nSmaller={selectedAgeDistribution.n_smaller}
        nLarger={selectedAgeDistribution.n_larger}
        xLabel="Age"
        yLabel="Individuals"
      />

      <ControlSection>
        <Select
          id="age-distribution-sample"
          onChange={e => {
            setSelectedSamples(e.target.value)
          }}
          value={selectedSamples}
        >
          <option value="het">Heterozygous Variant Carriers</option>
          <option value="hom">Homozygous Variant Carriers</option>
        </Select>
      </ControlSection>
    </div>
  )
}

StructuralVariantAgeDistribution.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantAgeDistribution

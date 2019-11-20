import React, { useState } from 'react'

import { Select } from '@broad/ui'

import Histogram from '../Histogram'
import ControlSection from '../VariantPage/ControlSection'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const StructuralVariantAgeDistribution = ({ variant }) => {
  const [selectedSamples, setSelectedSamples] = useState('het') // 'het' or 'hom'

  const selectedAgeDistribution = variant.age_distribution[selectedSamples]

  // Only show histogram if there is data to show
  const isAgeDataAvailable = [
    ...variant.age_distribution.het.bin_freq,
    variant.age_distribution.het.n_smaller,
    variant.age_distribution.het.n_larger,
    ...variant.age_distribution.hom.bin_freq,
    variant.age_distribution.hom.n_smaller,
    variant.age_distribution.hom.n_larger,
  ].some(n => n !== 0)

  if (!isAgeDataAvailable) {
    return <p>Age data is not available for this variant.</p>
  }

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
        formatTooltip={bin => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
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

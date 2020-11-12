import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { Select } from '@gnomad/ui'

import overallAgeDistribution from '../dataset-constants/gnomad-v3-mitochondria/gnomadV3MitochondrialVariantAgeDistribution.json'
import Histogram from '../Histogram'
import ControlSection from '../VariantPage/ControlSection'

const MitochondrialVariantAgeDistribution = ({ variant }) => {
  const [selectedSamples, setSelectedSamples] = useState('hom')

  const selectedAgeDistribution =
    selectedSamples === 'all' ? overallAgeDistribution : variant.age_distribution[selectedSamples]

  return (
    <>
      <div style={{ height: '260px' }}>
        {selectedAgeDistribution.bin_freq.some(n => n > 0) ? (
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
        ) : (
          <p>Age data not available.</p>
        )}
      </div>

      <ControlSection>
        <Select
          id="age-distribution-sample"
          onChange={e => {
            setSelectedSamples(e.target.value)
          }}
          value={selectedSamples}
        >
          <option value="hom">Homoplasmic Variant Carriers</option>
          <option value="het">Heteroplasmic Variant Carriers</option>
          <option value="all">All Individuals</option>
        </Select>
      </ControlSection>
    </>
  )
}

MitochondrialVariantAgeDistribution.propTypes = {
  variant: PropTypes.shape({
    age_distribution: PropTypes.shape({
      het: PropTypes.shape({
        bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
        bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
        n_smaller: PropTypes.number,
        n_larger: PropTypes.number,
      }).isRequired,
      hom: PropTypes.shape({
        bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
        bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
        n_smaller: PropTypes.number,
        n_larger: PropTypes.number,
      }).isRequired,
    }),
  }).isRequired,
}

export default MitochondrialVariantAgeDistribution

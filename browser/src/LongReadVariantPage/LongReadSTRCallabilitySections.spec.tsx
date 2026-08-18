import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { LongReadAlleleSizeDistributionSection } from './LongReadSTRDistributionSections'

jest.mock('@gnomad/ui', () => ({
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
}))
jest.mock('../help/InfoButton', () => () => null)
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot', () => () => (
  <div data-testid="allele-repeat-count-plot" />
))
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect', () => () => null)
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect', () => () => null)

const alleleSizeDistribution = [
  {
    ancestry_group: 'afr' as const,
    sex: 'XX' as const,
    repunit: 'AAAAG',
    distribution: [{ repunit_count: 10, frequency: 10, colorByValue: null }],
  },
  {
    ancestry_group: 'afr' as const,
    sex: 'XY' as const,
    repunit: 'AAAAG',
    distribution: [{ repunit_count: 11, frequency: 6, colorByValue: null }],
  },
  {
    ancestry_group: 'eas' as const,
    sex: 'XX' as const,
    repunit: 'AAAAG',
    distribution: [{ repunit_count: 12, frequency: 14, colorByValue: null }],
  },
]

const genotypeDistribution = [
  {
    ancestry_group: 'afr',
    sex: 'XX' as const,
    short_allele_repunit: 'AAAAG',
    long_allele_repunit: 'AAAAG',
    distribution: [{ short_allele_repunit_count: 10, long_allele_repunit_count: 10, frequency: 5 }],
  },
  {
    ancestry_group: 'afr',
    sex: 'XY' as const,
    short_allele_repunit: 'AAAAG',
    long_allele_repunit: 'AAAAG',
    distribution: [{ short_allele_repunit_count: 10, long_allele_repunit_count: 11, frequency: 3 }],
  },
  {
    ancestry_group: 'eas',
    sex: 'XX' as const,
    short_allele_repunit: 'AAAAG',
    long_allele_repunit: 'AAAAG',
    distribution: [{ short_allele_repunit_count: 11, long_allele_repunit_count: 12, frequency: 7 }],
  },
]

describe('long-read exact histogram callability controls', () => {
  test('updates called denominators with ancestry and sex without inventing no-call counts', () => {
    render(
      <LongReadAlleleSizeDistributionSection
        variantId="exact-locus"
        alleleSizeDistribution={alleleSizeDistribution}
        maxRepunits={12}
        repeatUnit="AAAAG"
        heading="Allele repeat-count distribution"
        calledCountDistributions={{ alleleSizeDistribution, genotypeDistribution }}
      />
    )

    expect(screen.getByTestId('allele-repeat-count-plot')).not.toBeNull()
    expect(screen.getByText(/30 called alleles; 15 complete two-allele genotypes/)).not.toBeNull()
    expect(screen.getByText(/No-call denominator unavailable/)).not.toBeNull()

    fireEvent.change(screen.getByLabelText(/Genetic ancestry group/), {
      target: { value: 'afr' },
    })
    expect(screen.getByText(/16 called alleles; 8 complete two-allele genotypes/)).not.toBeNull()

    fireEvent.change(screen.getByLabelText(/Sex:/), { target: { value: 'XX' } })
    expect(screen.getByText(/10 called alleles; 5 complete two-allele genotypes/)).not.toBeNull()
  })
})

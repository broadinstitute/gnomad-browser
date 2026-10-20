import React from 'react'
import { render, screen } from '@testing-library/react'

import GnomadLongReadDownloads from './GnomadLongReadDownloads'

test('links both cohorts to the public release VCFs, matching indexes, and README', () => {
  render(<GnomadLongReadDownloads />)
  const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
  const roots = [
    'https://storage.googleapis.com/gcp-public-data--gnomad',
    'https://gnomad-public-us-east-1.s3.amazonaws.com',
  ]
  const chromosomes = [...Array.from({ length: 22 }, (_, i) => `${i + 1}`), 'X', 'Y']
  const expected: string[] = []
  for (const root of roots) {
    expected.push(`${root}/release/lr/0.1/vcf/README.md`)
    for (const [cohort, prefix] of [
      ['hgsvc_hprc', 'gnomad.lr.genomes.0.1.hgsvc_hprc'],
      ['aou', 'gnomad.lr.genomes.0.1.aou.sites'],
    ]) {
      for (const chrom of chromosomes) {
        const vcf = `${root}/release/lr/0.1/vcf/${cohort}/${prefix}.chr${chrom}.vcf.gz`
        expected.push(vcf, `${vcf}.tbi`)
      }
    }
  }
  // One additional prose link goes to the same public README, not an unpublished blog URL.
  expected.push(`${roots[0]}/release/lr/0.1/vcf/README.md`)
  expect(hrefs.sort()).toEqual(expected.sort())
  expect(screen.getByRole('link', { name: 'release README' }).getAttribute('href')).toBe(
    `${roots[0]}/release/lr/0.1/vcf/README.md`
  )
  expect(screen.getByText('chr1 sites VCF')).not.toBeNull()
  expect(screen.getByText('chr1 VCF with genotypes')).not.toBeNull()
})

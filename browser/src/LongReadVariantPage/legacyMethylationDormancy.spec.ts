import fs from 'fs'
import path from 'path'

const source = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8')

describe('legacy sample-total methylation dormancy', () => {
  test.each([
    ['HaplotypeRegionPage route', '../HaplotypeRegionPage/HaplotypeRegionPage.tsx'],
    ['LongReadHaplotypeView route', './LongReadHaplotypeView.tsx'],
  ])('%s has no old automatic query or control owner', (_label, relativePath) => {
    const routeSource = source(relativePath)

    expect(routeSource).not.toContain('methylation_summary(')
    expect(routeSource).not.toContain('methylation_outliers(')
    expect(routeSource).not.toContain('query RegionMethylation(')
    expect(routeSource).not.toContain('onLoadAllSamples=')
    expect(routeSource).not.toContain('show_methylation')
    expect(routeSource).not.toContain('methylation_sample')
  })

  test('per-CpG tooltip denominator remains distinct from row-level empty labels', () => {
    const tooltipSource = source('../Haplotypes/DeckGLLollipopTrack.tsx')
    const stateSource = source('./perCopyMethylation.ts')

    expect(tooltipSource).toContain('Samples contributing at this CpG:')
    expect(tooltipSource).not.toContain('Available samples in row:')
    expect(stateSource).toContain("return 'unavailable'")
    expect(stateSource).toContain("return 'no CpGs'")
  })
})

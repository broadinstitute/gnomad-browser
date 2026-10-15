import { filterDisplayVariants, groupCarriers } from './haplotypeCompute'
import type { LRVariant } from './index'

const variants: LRVariant[] = [null, 0, 0.1].map((af, i) => ({
  variant_id: `chr1-${100 + i}-A-G`, chrom: '1', pos: 100 + i,
  ref: 'A', alt: 'G', allele_type: 'snv', allele_length: 0,
  freq: { af, ac: 7, an: 2054 }, populations: [{ id: 'afr', af }], rsid: '',
}))

it('keeps missing AF as background under active filters and as a record when filtering is disabled', () => {
  const groups = groupCarriers(variants, { 'sample:1': [0, 1, 2] }, 0)
  expect(groups[0].variants.variants.map(v => v.freq.af)).toEqual([null, 0, 0.1])
  const data = filterDisplayVariants({ groups, tree_json: '', clusters: [], phase_set_sidecar: { by_carrier: {}, variant_ids_by_index: [] } }, 0.01)
  const group = data.groups[0] as typeof groups[0]
  expect(group.variants.variants.map(v => v.freq.af)).toEqual([0.1])
  expect(group.below_threshold.variants.map(v => v.freq.af)).toEqual([null, 0])
  expect(group.below_threshold.variants[0].freq).toEqual({ af: null, ac: 7, an: 2054 })
  expect(variants.map(v => v.freq.af)).toEqual([null, 0, 0.1])
})

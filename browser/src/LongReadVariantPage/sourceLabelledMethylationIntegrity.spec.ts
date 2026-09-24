import { aggregatePerCopyMethylation, joinedCapabilityConfirmed } from './perCopyMethylation'
import { indexJoinedMethylationByCopy } from '../Haplotypes/clusterMethylation'

// A source-labelled capability is not an orientation receipt, even if its raw
// data are otherwise available and a consumer mistakenly passes it downstream.
test('unjoined candidate capability and HAP1/HAP2 never become chromosome copies', () => {
  expect(joinedCapabilityConfirmed({ available: true, joinable_to_vcf: false,
    status: 'AVAILABLE_ORIENTATION_UNCONFIRMED', orientation_status: 'UNCONFIRMED',
    phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET', source_sample_ids: ['HG00097'],
  } as any)).toBe(false)
  const rows = [1, 2].map((hap) => ({ chr: 'chr22', pos1: 100, pos2: 101,
    sample: 'HG00097', methylation: 80, coverage: 10, data_layer: 'SOURCE_PHASED',
    source_haplotype: `HAP${hap}`, vcf_strand: null, phase_set: null }))
  const samples = [{ sample_id: 'HG00097', strand_mapping: { strandA: 1, strandB: 2 },
    phase_set_mapping: { phaseSetA: null, phaseSetB: null } }]
  expect(aggregatePerCopyMethylation(rows as any, samples)).toEqual({ A: [], B: [] })
  expect(indexJoinedMethylationByCopy(rows as any).size).toBe(0)
})

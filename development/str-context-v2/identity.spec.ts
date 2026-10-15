/* eslint-disable no-restricted-syntax -- Node-only bounded offline identity fixtures. */
// Retained capture metadata, IDENTITY ONLY: no histogram rows, projection or admission.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validatePhysicalCaptureIdentity } from './generate'

const inputs = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__/identity-test-inputs-and-results.json'), 'utf8')
)
for (const input of inputs.results) {
  describe(`${input.cohort} mirrored capture identity only`, () => {
    const receipt = input.capture_receipt
    // Construct only the eight identity fields consumed by generate.ts from retained
    // metadata. This is not an actual captured row or evidence for its body/shape.
    const row = {
      contract: receipt.contract,
      cohort: receipt.cohort,
      run_id: receipt.run_id,
      task_id: receipt.task_id,
      source_uri: receipt.source_uri,
      source_generation: receipt.source_generation,
      source_md5_base64: receipt.source_md5_base64,
      source_size_bytes: receipt.source_size_bytes,
    }
    const expected = {
      version: 'str-context-v2.3',
      source: input.source,
      cohort: input.cohort,
      run_id: receipt.run_id,
      task_id: receipt.task_id,
    }
    test('receipt and constructed identity header pass v2.3 without mutating metadata', () => {
      const before = JSON.stringify({ row, receipt })
      expect(() => validatePhysicalCaptureIdentity(receipt, expected)).not.toThrow()
      expect(() => validatePhysicalCaptureIdentity(row, expected)).not.toThrow()
      expect(Object.keys(row)).toHaveLength(8)
      expect(JSON.stringify({ row, receipt })).toBe(before)
    })
    test('v2.1 is not silently reinterpreted; its original-key guards reject honest captures', () => {
      for (const value of [receipt, row]) {
        expect(value.source_uri).not.toBe(input.source.uri)
        expect(value.source_generation).not.toBe(input.source.generation)
        expect(() =>
          validatePhysicalCaptureIdentity(value, { ...expected, version: 'str-context-v2.1' })
        ).toThrow('projection rules')
      }
    })
    test.each(['original', 'mixed', 'generation', 'cohort', 'run', 'task', 'size', 'md5'])(
      'rejects %s corruption in identity header AND receipt',
      (kind) => {
        for (const value of [receipt, row]) {
          const changed = { ...value }
          if (kind === 'original') {
            changed.source_uri = input.source.uri
            changed.source_generation = input.source.generation
          }
          if (kind === 'mixed') changed.source_generation = input.source.generation
          if (kind === 'generation') changed.source_generation = '999'
          if (kind === 'cohort') changed.cohort = 'other'
          if (kind === 'run') changed.run_id = 'other'
          if (kind === 'task') changed.task_id = 'other'
          if (kind === 'size') changed.source_size_bytes = 1
          if (kind === 'md5') changed.source_md5_base64 = 'AAAAAAAAAAAAAAAAAAAAAA=='
          expect(() => validatePhysicalCaptureIdentity(changed, expected)).toThrow()
        }
      }
    )
  })
}

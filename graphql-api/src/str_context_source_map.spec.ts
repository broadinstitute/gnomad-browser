/* eslint-disable no-param-reassign -- Adversarial fixtures deliberately mutate one invariant at a time. */
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateStrContextSourceMap, StrContextSourceMapArtifacts } from './str_context_source_map'
import { writeSourceMapFixture } from './__fixtures__/str_context_source_map'
import { strContextDigest, validateContextNamespaces } from './str_context_identity'

const sha = (raw: string | Buffer) => createHash('sha256').update(raw).digest('hex')
const clone = (v: any) => JSON.parse(JSON.stringify(v))
const fixtureDir = join(__dirname, '__fixtures__/str-context-source-map')
const realMapPath = join(fixtureDir, 'histogram-mirror-manifest.json')
const realMapRaw = readFileSync(realMapPath)
const realMap = JSON.parse(realMapRaw.toString())
const realMetadata = JSON.parse(
  readFileSync(join(fixtureDir, 'original-runtime-metadata-verified.json'), 'utf8')
)
const realInputs = JSON.parse(
  readFileSync(join(fixtureDir, 'identity-test-inputs-and-results.json'), 'utf8')
)
const receipt = (): any => ({
  cohort: 'aou',
  run_id: 'synthetic_run',
  source: {
    uri: 'gs://fixture/original.tsv',
    generation: '123',
    byte_size: 100,
    md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
    runtime_uri: 'gs://fixture/runtime.tsv',
    runtime_generation: '456',
    runtime_byte_size: 100,
    runtime_md5_base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
  },
  capture: {
    database: 'gnomad_lr_y1_scratch_histogram_aou_synthetic_run',
    run_id: 'synthetic_run',
    source_map_sha256: '',
    receipt_sha256: 'a'.repeat(64),
    task_id: 'custom_0',
    physical_rows: 1,
  },
})

let directory: string
let r: any
let artifacts: StrContextSourceMapArtifacts
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'str-source-map-'))
  r = receipt()
  artifacts = writeSourceMapFixture(directory, r).artifacts
})
afterEach(() => rmSync(directory, { recursive: true, force: true }))
const validate = () => validateStrContextSourceMap(r, artifacts)
const changeVerification = (change: (value: any) => void) => {
  const v = JSON.parse(readFileSync(artifacts.verificationPath, 'utf8'))
  change(v)
  const raw = JSON.stringify(v)
  writeFileSync(artifacts.verificationPath, raw)
  artifacts.verificationSha256 = sha(raw)
}
const changeMap = (change: (value: any) => void) => {
  const m = JSON.parse(readFileSync(artifacts.sourceMapPath, 'utf8'))
  change(m)
  const raw = JSON.stringify(m)
  writeFileSync(artifacts.sourceMapPath, raw)
  r.capture.source_map_sha256 = sha(raw)
  changeVerification((v) => {
    v.source_map_sha256 = r.capture.source_map_sha256
  })
}

test('real identity input fixtures retain their archived raw-byte hashes', () => {
  const hashes = {
    'histogram-mirror-manifest.json':
      '499adbea8e1441ddb07d9918d14220704dcde626a43a8795726a50d4275100d5',
    'original-runtime-metadata-verified.json':
      'a6f3e5d666e8a42aa8cb3bb5abe917116f694d0d69f44bfea11d356be86edf4e',
    'identity-test-inputs-and-results.json':
      'bdcb936a84477d4f28229f3e94f439f257b64f2c193ad495929e85fa879b08ab',
  }
  for (const [name, hash] of Object.entries(hashes)) {
    expect(sha(readFileSync(join(fixtureDir, name)))).toBe(hash)
  }
})

test('accepts a synthetic mirror only with pinned, linked operator evidence', () => {
  expect(validate()).toBeUndefined()
  delete r.capture.physical_rows
  expect(validate()).toBeUndefined()
})
test('accepts explicit synthetic direct-read evidence without identity fallback', () => {
  Object.assign(r.source, {
    runtime_uri: r.source.uri,
    runtime_generation: r.source.generation,
  })
  artifacts = writeSourceMapFixture(directory, r).artifacts
  const v = JSON.parse(readFileSync(artifacts.verificationPath, 'utf8'))
  expect(v.captures[0].read_evidence.kind).toBe('direct_read')
  expect(validate()).toBeUndefined()
  changeVerification((e) => {
    e.captures[0].read_evidence = {
      kind: 'create_only_mirror',
      source_immutable_uri: v.captures[0].original.immutable_uri,
      destination_immutable_uri: v.captures[0].runtime.immutable_uri,
      if_generation_match: '0',
      status: 'success',
    }
  })
  expect(validate).toThrow(/explicit direct_read/)
})

// These are real identity inputs, not a serving receipt or a projection. The
// wrapper below is a TEST-LOCAL operator assertion exercising schema/linkage,
// not a newly issued real-world attestation or authorization to serve data.
test.each(['hgsvc_hprc', 'aou'])(
  'unchanged real %s identity-only: v2.3 pinned capture and distinct projection linkage passes',
  (cohort) => {
    const input = realInputs.results.find((x: any) => x.cohort === cohort)
    const mapEntry = realMap.objects.find((x: any) => x.cohort === cohort)
    const backend = input.capture_receipt
    r = {
      cohort,
      database: `gnomad_lr_y1_scratch_histogram_projection_${cohort}_refresh_20260924_prep_1c61785d`,
      projection: { instance_id: 'refresh_20260924_prep_1c61785d' },
      run_id: backend.run_id,
      source: clone(input.source),
      capture: {
        database: backend.database,
        run_id: backend.run_id,
        source_map_sha256: sha(realMapRaw),
        task_id: backend.task_id,
        // A test-local digest of the unchanged embedded backend receipt, not a
        // claim about the byte serialization of a separately archived receipt.
        receipt_sha256: strContextDigest(backend),
        physical_rows: backend.validated_rows,
      },
    }
    const verification = {
      schema_version: 2,
      verification_kind: 'str_context_source_map_operator_v2',
      source_map_sha256: sha(realMapRaw),
      captures: [
        {
          cohort,
          database: backend.database,
          backend_receipt: clone(backend),
          run_id: backend.run_id,
          task_id: backend.task_id,
          receipt_sha256: r.capture.receipt_sha256,
          expected_source_rows: mapEntry.expected_source_rows,
          original: mapEntry.original,
          runtime: mapEntry.runtime,
          metadata: realMetadata.filter((x: any) => x.cohort === cohort),
          read_evidence: {
            kind: 'create_only_mirror',
            source_immutable_uri: mapEntry.original.immutable_uri,
            destination_immutable_uri: mapEntry.runtime.immutable_uri,
            if_generation_match: '0',
            status: 'success',
          },
        },
      ],
    }
    const raw = JSON.stringify(verification)
    writeFileSync(artifacts.verificationPath, raw)
    artifacts = { ...artifacts, sourceMapPath: realMapPath, verificationSha256: sha(raw) }
    expect(backend.source_uri).toBe(r.source.runtime_uri)
    expect(backend.source_generation).toBe(r.source.runtime_generation)
    // The archived v2.1 generator required these exact original-key guards.
    // Exercise that identity-only negative, not a fabricated full admission.
    const v21IdentityGuard = () => {
      if (backend.source_uri !== r.source.uri) throw new Error('v2.1 capture source_uri mismatch')
      if (backend.source_generation !== r.source.generation)
        throw new Error('v2.1 capture source_generation mismatch')
    }
    expect(v21IdentityGuard).toThrow(/v2.1 capture source_uri mismatch/)
    expect(backend.source_generation).not.toBe(r.source.generation)
    expect(
      input.current_guard_evaluations.every((guard: any) => guard.current_guard_passes === false)
    ).toBe(true)
    const before = JSON.stringify(r)
    expect(() => validateContextNamespaces(r)).not.toThrow()
    expect(r.database).not.toBe(backend.database)
    expect(validate()).toBeUndefined() // v2.3 identity/evidence gate only.
    expect(JSON.stringify(r)).toBe(before)
    expect(readFileSync(realMapPath)).toEqual(realMapRaw)
    const valid = clone(r)
    for (const kind of [
      'capture_db',
      'capture_run',
      'source_map',
      'backend_digest',
      'overlap',
      'relabel',
    ]) {
      r = clone(valid)
      if (kind === 'capture_db') r.capture.database += '_wrong'
      if (kind === 'capture_run') r.capture.run_id = 'wrong'
      if (kind === 'source_map') r.capture.source_map_sha256 = 'b'.repeat(64)
      if (kind === 'backend_digest') r.capture.receipt_sha256 = 'b'.repeat(64)
      if (kind === 'overlap') r.database = r.capture.database
      if (kind === 'relabel') {
        r.run_id = r.projection.instance_id
        r.capture.run_id = r.run_id
        r.capture.database = `gnomad_lr_y1_scratch_histogram_${cohort}_${r.run_id}`
      }
      const changed = r
      const pinnedArtifacts = artifacts
      expect(() => {
        validateContextNamespaces(changed)
        validateStrContextSourceMap(changed, pinnedArtifacts)
      }).toThrow()
    }
    r = clone(valid)
    r.source.uri = r.source.runtime_uri
    r.source.generation = r.source.runtime_generation
    expect(validate).toThrow(/source original/)
  }
)

test.each(['source_map_sha256', 'receipt_sha256'])('rejects missing or malformed %s', (key) => {
  delete r.capture[key]
  expect(validate).toThrow(/SHA256/)
  r.capture[key] = 'not-a-digest'
  expect(validate).toThrow(/SHA256/)
})
test('rejects wrong well-shaped source-map SHA', () => {
  r.capture.source_map_sha256 = 'b'.repeat(64)
  expect(validate).toThrow(/raw SHA256/)
})
test('rejects missing or wrong operator pin and missing artifacts', () => {
  expect(() => validateStrContextSourceMap(r, undefined as any)).toThrow()
  artifacts.verificationSha256 = ''
  expect(validate).toThrow(/SHA256/)
  artifacts.verificationSha256 = 'b'.repeat(64)
  expect(validate).toThrow(/raw SHA256/)
})
test.each(['sourceMapPath', 'verificationPath'] as const)('rejects missing %s', (key) => {
  artifacts[key] = join(directory, 'missing')
  expect(validate).toThrow()
})
test.each(['sourceMapPath', 'verificationPath'] as const)(
  'pins raw bytes, not parsed JSON: %s',
  (key) => {
    writeFileSync(artifacts[key], `${readFileSync(artifacts[key], 'utf8')}\n`)
    expect(validate).toThrow(/raw SHA256/)
  }
)
test('rejects reserialized map even when operator file has the old well-shaped hash', () => {
  const raw = JSON.stringify(JSON.parse(readFileSync(artifacts.sourceMapPath, 'utf8')))
  writeFileSync(artifacts.sourceMapPath, raw)
  r.capture.source_map_sha256 = sha(raw)
  expect(validate).toThrow(/source_map_sha256 linkage/)
})
test.each(['sourceMapPath', 'verificationPath'] as const)('bounds %s file reads', (key) => {
  writeFileSync(artifacts[key], Buffer.alloc(1024 * 1024 + 1))
  expect(validate).toThrow(/1 MiB/)
  artifacts[key] = directory
  expect(validate).toThrow(/regular file/)
})

test.each([
  ['duplicate cohort', (m: any) => m.objects.push(clone(m.objects[0])), /duplicate/],
  [
    'missing cohort',
    (m: any) => {
      m.objects[0].cohort = 'hgsvc_hprc'
    },
    /cohort missing/,
  ],
  [
    'unknown root field',
    (m: any) => {
      m.allow_mirror = true
    },
    /keys/,
  ],
  [
    'wrong schema',
    (m: any) => {
      m.schema_version = 2
    },
    /schema_version/,
  ],
  [
    'bad immutable URI',
    (m: any) => {
      m.objects[0].original.immutable_uri += '9'
    },
    /immutable_uri/,
  ],
  [
    'mixed immutable identity',
    (m: any) => {
      m.objects[0].runtime.immutable_uri = m.objects[0].original.immutable_uri
    },
    /immutable_uri/,
  ],
  [
    'unqualified generation',
    (m: any) => {
      m.objects[0].original.generation = ''
    },
    /generation/,
  ],
  [
    'unsafe size',
    (m: any) => {
      m.objects[0].original.size_bytes = Number.MAX_SAFE_INTEGER + 1
    },
    /count/,
  ],
  [
    'negative rows',
    (m: any) => {
      m.objects[0].expected_source_rows = -1
    },
    /count/,
  ],
  [
    'non-equivalent size',
    (m: any) => {
      m.objects[0].runtime.size_bytes += 1
    },
    /equivalence/,
  ],
  [
    'non-equivalent MD5',
    (m: any) => {
      m.objects[0].runtime.md5_base64 = 'AQEBAQEBAQEBAQEBAQEBAQ=='
    },
    /equivalence/,
  ],
  [
    'non-equivalent CRC',
    (m: any) => {
      m.objects[0].runtime.crc32c_base64 = 'AQEBAQ=='
    },
    /equivalence/,
  ],
  [
    'malformed MD5',
    (m: any) => {
      m.objects[0].original.md5_base64 = 'A'
    },
    /MD5/,
  ],
  [
    'malformed CRC',
    (m: any) => {
      m.objects[0].original.crc32c_base64 = 'A'
    },
    /CRC32C/,
  ],
  [
    'URI with generation',
    (m: any) => {
      m.objects[0].original.uri += '#123'
    },
    /URI/,
  ],
] as [string, (m: any) => void, RegExp][])(
  'rejects map %s even after repinning',
  (_, mutate, error) => {
    changeMap(mutate)
    expect(validate).toThrow(error)
  }
)

test.each([
  ['uri', 'gs://fixture/runtime.tsv'],
  ['generation', '456'],
  ['byte_size', 101],
  ['md5_base64', 'AQEBAQEBAQEBAQEBAQEBAQ=='],
  ['runtime_uri', 'gs://fixture/original.tsv'],
  ['runtime_generation', '123'],
  ['runtime_byte_size', 101],
  ['runtime_md5_base64', 'AQEBAQEBAQEBAQEBAQEBAQ=='],
])('rejects envelope role/identity change %s', (key, value) => {
  r.source[key] = value
  expect(validate).toThrow(/source (original|runtime)/)
})
test.each([0, 2, -1, 1.5, '1', null, undefined])('rejects supplied physical_rows %s', (rows) => {
  r.capture.physical_rows = rows
  expect(validate).toThrow(/physical_rows/)
})

test.each([
  [
    'map digest',
    (v: any) => {
      v.source_map_sha256 = 'b'.repeat(64)
    },
    /source_map_sha256/,
  ],
  [
    'cohort',
    (v: any) => {
      v.captures[0].cohort = 'hgsvc_hprc'
    },
    /cohort/,
  ],
  [
    'run',
    (v: any) => {
      v.captures[0].run_id = 'wrong'
    },
    /capture database/,
  ],
  [
    'task',
    (v: any) => {
      v.captures[0].task_id = 'wrong'
    },
    /backend receipt task_id/,
  ],
  [
    'receipt digest',
    (v: any) => {
      v.captures[0].receipt_sha256 = 'b'.repeat(64)
    },
    /canonical digest/,
  ],
  [
    'expected rows',
    (v: any) => {
      v.captures[0].expected_source_rows += 1
    },
    /expected_source_rows/,
  ],
  ['duplicate linkage', (v: any) => v.captures.push(clone(v.captures[0])), /duplicate/],
  [
    'swapped roles',
    (v: any) => {
      const c = v.captures[0]
      ;[c.original, c.runtime] = [c.runtime, c.original]
    },
    /operator original/,
  ],
  [
    'map-original mismatch',
    (v: any) => {
      v.captures[0].original.size_bytes += 1
    },
    /original.size_bytes/,
  ],
  [
    'map-runtime mismatch',
    (v: any) => {
      v.captures[0].runtime.size_bytes += 1
    },
    /runtime.size_bytes/,
  ],
  [
    'missing metadata',
    (v: any) => {
      v.captures[0].metadata = []
    },
    /metadata/,
  ],
  ['missing role', (v: any) => v.captures[0].metadata.pop(), /both roles/],
  [
    'duplicate metadata role',
    (v: any) => {
      v.captures[0].metadata[1].kind = 'original'
    },
    /roles/,
  ],
  [
    'metadata cohort',
    (v: any) => {
      v.captures[0].metadata[0].cohort = 'hgsvc_hprc'
    },
    /metadata cohort/,
  ],
  [
    'unverified generation',
    (v: any) => {
      v.captures[0].metadata[0].pinned_generation_verified = false
    },
    /pinned_generation/,
  ],
  [
    'metadata generation',
    (v: any) => {
      v.captures[0].metadata[0].metadata.generation = '456'
    },
    /metadata generation/,
  ],
  [
    'metadata bucket',
    (v: any) => {
      v.captures[0].metadata[0].metadata.bucket = 'other'
    },
    /metadata bucket/,
  ],
  [
    'metadata name',
    (v: any) => {
      v.captures[0].metadata[0].metadata.name = 'other'
    },
    /metadata name/,
  ],
  [
    'metadata id',
    (v: any) => {
      v.captures[0].metadata[0].metadata.id = 'fixture/original.tsv'
    },
    /qualified id/,
  ],
  [
    'metadata size',
    (v: any) => {
      v.captures[0].metadata[0].metadata.size = '101'
    },
    /metadata size/,
  ],
  [
    'metadata MD5',
    (v: any) => {
      v.captures[0].metadata[0].metadata.md5Hash = 'AQEBAQEBAQEBAQEBAQEBAQ=='
    },
    /metadata MD5/,
  ],
  [
    'metadata CRC',
    (v: any) => {
      v.captures[0].metadata[0].metadata.crc32c = 'AQEBAQ=='
    },
    /metadata CRC/,
  ],
  [
    'metadata unpinned URL',
    (v: any) => {
      v.captures[0].metadata[0].metadata.mediaLink =
        'https://storage.googleapis.com/download/storage/v1/b/fixture/o/original.tsv?alt=media'
    },
    /generation/,
  ],
  [
    'metadata wrong URL generation',
    (v: any) => {
      v.captures[0].metadata[0].metadata.mediaLink =
        'https://storage.googleapis.com/download/storage/v1/b/fixture/o/original.tsv?generation=456&alt=media'
    },
    /generation/,
  ],
  [
    'missing mirror proof',
    (v: any) => {
      delete v.captures[0].read_evidence
    },
    /keys/,
  ],
  [
    'unqualified copy source',
    (v: any) => {
      v.captures[0].read_evidence.source_immutable_uri = 'gs://fixture/original.tsv'
    },
    /mirror source/,
  ],
  [
    'copy destination',
    (v: any) => {
      v.captures[0].read_evidence.destination_immutable_uri = 'gs://fixture/runtime.tsv#789'
    },
    /mirror destination/,
  ],
  [
    'non-create-only mirror',
    (v: any) => {
      v.captures[0].read_evidence.if_generation_match = '456'
    },
    /create-only/,
  ],
  [
    'failed mirror',
    (v: any) => {
      v.captures[0].read_evidence.status = 'failed'
    },
    /status/,
  ],
  [
    'direct-read bypass',
    (v: any) => {
      v.captures[0].read_evidence = {
        kind: 'direct_read',
        immutable_uri: v.captures[0].original.immutable_uri,
        status: 'success',
      }
    },
    /original == runtime/,
  ],
  [
    'unknown proof kind',
    (v: any) => {
      v.captures[0].read_evidence.kind = 'same_bytes'
    },
    /kind/,
  ],
] as [string, (v: any) => void, RegExp][])(
  'rejects operator %s even after repinning',
  (_, mutate, error) => {
    changeVerification(mutate)
    expect(validate).toThrow(error)
  }
)

test.each(['database', 'run_id'])('rejects wrong capture %s independently of projection', (key) => {
  r.capture[key] = 'wrong'
  expect(validate).toThrow(/capture/)
})
test.each(['database', 'run_id', 'source_uri', 'source_generation', 'status'])(
  'rejects changed embedded backend %s even with all digests repinned',
  (key) => {
    changeVerification((v) => {
      const c = v.captures[0]
      c.backend_receipt[key] = 'wrong'
      c.receipt_sha256 = strContextDigest(c.backend_receipt)
      r.capture.receipt_sha256 = c.receipt_sha256
    })
    expect(validate).toThrow(/backend receipt/)
  }
)
test.each([undefined, null, -1, 2, 0.5, 'garbage'])(
  'rejects malformed backend zero_called_rows=%s after repinning',
  (value) => {
    changeVerification((v) => {
      const c = v.captures[0]
      if (value === undefined) delete c.backend_receipt.zero_called_rows
      else c.backend_receipt.zero_called_rows = value
      c.receipt_sha256 = strContextDigest(c.backend_receipt)
      r.capture.receipt_sha256 = c.receipt_sha256
    })
    expect(validate).toThrow(/backend receipt/)
  }
)
test('reconciles backend zero-called count against projected allele availability', () => {
  r.counts = { source_rows: 1, allele_available_rows: 1 }
  expect(validate).not.toThrow()
  r.counts.allele_available_rows = 0
  expect(validate).toThrow(/zero_called_rows projection reconciliation/)
})
test('rejects mutated backend receipt with its original digest', () => {
  changeVerification((v) => {
    v.captures[0].backend_receipt.database = 'other'
  })
  expect(validate).toThrow(/canonical digest/)
})
test('rejects old operator schema instead of reinterpreting the old artifact', () => {
  changeVerification((v) => {
    v.schema_version = 1
    v.verification_kind = 'str_context_source_map_operator_v1'
  })
  expect(validate).toThrow(/schema_version/)
})

test('rejects malformed pinned JSON and invalid UTF-8', () => {
  for (const bytes of [Buffer.from('{'), Buffer.from([0xff])]) {
    writeFileSync(artifacts.sourceMapPath, bytes)
    r.capture.source_map_sha256 = sha(bytes)
    expect(validate).toThrow()
  }
})
test('one bad unselected map cohort fails the whole evidence file', () => {
  changeMap((m) => {
    const other = clone(m.objects[0])
    other.cohort = 'hgsvc_hprc'
    other.runtime.size_bytes += 1
    m.objects.push(other)
  })
  expect(validate).toThrow(/equivalence/)
})

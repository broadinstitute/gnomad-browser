const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { describe, test } = require('node:test')

const { openGeneStore } = require('../../bindings')

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures')
const DATASET_NAME = 'gene_models_grch38'
const FIXTURE_DIRECTORY = path.join(FIXTURE_ROOT, DATASET_NAME)
const FIXTURE_PARQUET = path.join(FIXTURE_DIRECTORY, 'data.parquet')
const PCSK9_ID = 'ENSG00000169174'
const TTTY6B_ID = 'ENSG00000131548'
const COORDINATE_FIELDS = ['start', 'stop', 'xstart', 'xstop']

const assertObjectKeys = (value, keys) => {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value))
  assert.deepStrictEqual(Object.keys(value).sort(), [...keys].sort())
}

const assertStringArray = (value) => {
  assert.ok(Array.isArray(value))
  value.forEach((element) => assert.strictEqual(typeof element, 'string'))
}

const assertNullable = (value, checkValue) => {
  assert.notStrictEqual(value, undefined, 'Nullable values must be explicit null, not undefined')
  if (value !== null) {
    checkValue(value)
  }
}

const assertInterval = (interval) => {
  assertObjectKeys(interval, ['start', 'end', 'includes_start', 'includes_end'])
  const loci = [interval.start, interval.end]
  loci.forEach((locus) => {
    assertObjectKeys(locus, ['contig', 'position'])
    assert.strictEqual(typeof locus.contig, 'string')
    assert.ok(Number.isSafeInteger(locus.position))
  })
  assert.strictEqual(typeof interval.includes_start, 'boolean')
  assert.strictEqual(typeof interval.includes_end, 'boolean')
}

const assertExons = (exons) => {
  assert.ok(Array.isArray(exons))
  exons.forEach((exon) => {
    assertObjectKeys(exon, ['feature_type', ...COORDINATE_FIELDS])
    assert.strictEqual(typeof exon.feature_type, 'string')
    COORDINATE_FIELDS.forEach((field) => {
      assert.ok(Number.isSafeInteger(exon[field]), `${field} must be a safe JS number`)
    })
  })
}

const assertTissues = (tissues) => {
  assert.ok(Array.isArray(tissues))
  tissues.forEach((tissue) => {
    assertObjectKeys(tissue, ['tissue', 'value'])
    assert.strictEqual(typeof tissue.tissue, 'string')
    assertNullable(tissue.value, (value) => assert.strictEqual(typeof value, 'number'))
  })
}

const createTemporaryRoot = async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gnomad-gene-store-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  return root
}

const copyGeneFixture = async (root, filename = 'data.parquet') => {
  const directory = path.join(root, DATASET_NAME)
  await fs.mkdir(directory, { recursive: true })
  await fs.copyFile(FIXTURE_PARQUET, path.join(directory, filename))
  return directory
}

describe('Gene ID queries through Node-API', () => {
  test('returns all exported fields as JavaScript values with snake_case names', async () => {
    const store = await openGeneStore(FIXTURE_ROOT)
    const gene = await store.fetchGeneById(PCSK9_ID)

    assertObjectKeys(gene, [
      'gene_id',
      'gene_version',
      'symbol',
      'gencode_symbol',
      'reference_genome',
      'chrom',
      'strand',
      ...COORDINATE_FIELDS,
      'interval',
      'exons',
      'transcripts',
      'hgnc_id',
      'ncbi_id',
      'omim_id',
      'name',
      'flags',
      'canonical_transcript_id',
      'mane_select_transcript',
      'pext',
      'gnomad_constraint',
      'previous_symbols',
      'alias_symbols',
      'symbol_upper_case',
      'search_terms',
      'preferred_transcript_id',
      'preferred_transcript_source',
    ])
    assert.strictEqual(gene.gene_id, PCSK9_ID)
    assert.strictEqual(gene.symbol, 'PCSK9')
    const geneStringFields = [
      'gene_version',
      'gencode_symbol',
      'reference_genome',
      'chrom',
      'strand',
      'symbol_upper_case',
    ]
    geneStringFields.forEach((field) => assert.strictEqual(typeof gene[field], 'string'))
    COORDINATE_FIELDS.forEach((field) => {
      assert.ok(Number.isSafeInteger(gene[field]), `${field} must be a safe JS number`)
    })
    const geneNullableStringFields = [
      'hgnc_id',
      'ncbi_id',
      'omim_id',
      'name',
      'canonical_transcript_id',
      'preferred_transcript_id',
      'preferred_transcript_source',
    ]
    geneNullableStringFields.forEach((field) => {
      assertNullable(gene[field], (value) => assert.strictEqual(typeof value, 'string'))
    })
    assertStringArray(gene.flags)
    assertStringArray(gene.search_terms)
    assertNullable(gene.previous_symbols, assertStringArray)
    assertNullable(gene.alias_symbols, assertStringArray)
    assertInterval(gene.interval)
    assertExons(gene.exons)

    assert.ok(Array.isArray(gene.transcripts) && gene.transcripts.length > 0)
    gene.transcripts.forEach((transcript) => {
      assertObjectKeys(transcript, [
        'transcript_id',
        'transcript_version',
        'gene_id',
        'gene_version',
        'reference_genome',
        'chrom',
        'strand',
        ...COORDINATE_FIELDS,
        'interval',
        'exons',
        'gtex_tissue_expression',
        'refseq_id',
        'refseq_version',
      ])
      const transcriptStringFields = [
        'transcript_id',
        'transcript_version',
        'gene_id',
        'gene_version',
        'reference_genome',
        'chrom',
        'strand',
      ]
      transcriptStringFields.forEach((field) =>
        assert.strictEqual(typeof transcript[field], 'string')
      )
      assert.strictEqual(transcript.gene_id, gene.gene_id)
      COORDINATE_FIELDS.forEach((field) => {
        assert.ok(Number.isSafeInteger(transcript[field]), `${field} must be a safe JS number`)
      })
      assertInterval(transcript.interval)
      assertExons(transcript.exons)
      assertNullable(transcript.gtex_tissue_expression, assertTissues)
      assertNullable(transcript.refseq_id, (value) => assert.strictEqual(typeof value, 'string'))
      assertNullable(transcript.refseq_version, (value) =>
        assert.strictEqual(typeof value, 'string')
      )
    })

    assertObjectKeys(gene.mane_select_transcript, [
      'matched_gene_version',
      'ensembl_id',
      'ensembl_version',
      'refseq_id',
      'refseq_version',
    ])
    Object.values(gene.mane_select_transcript).forEach((value) => {
      assert.strictEqual(typeof value, 'string')
    })
    assertObjectKeys(gene.pext, ['regions', 'flags'])
    assertStringArray(gene.pext.flags)
    assert.ok(Array.isArray(gene.pext.regions) && gene.pext.regions.length > 0)
    gene.pext.regions.forEach((region) => {
      assertObjectKeys(region, ['chrom', 'start', 'stop', 'mean', 'tissues'])
      assert.strictEqual(typeof region.chrom, 'string')
      assert.ok(Number.isSafeInteger(region.start))
      assert.ok(Number.isSafeInteger(region.stop))
      assert.strictEqual(typeof region.mean, 'number')
      assertTissues(region.tissues)
    })

    const constraint = gene.gnomad_constraint
    const floatFields = [
      'exp_lof',
      'exp_mis',
      'exp_syn',
      'oe_lof',
      'oe_lof_lower',
      'oe_lof_upper',
      'oe_mis',
      'oe_mis_lower',
      'oe_mis_upper',
      'oe_syn',
      'oe_syn_lower',
      'oe_syn_upper',
      'lof_z',
      'mis_z',
      'syn_z',
      'pli',
    ]
    const integerFields = ['obs_lof', 'obs_mis', 'obs_syn', 'oe_lof_percentile']
    const stringFields = ['gene', 'gene_id', 'transcript']
    const booleanFields = ['canonical', 'mane_select']
    assertObjectKeys(constraint, [
      ...stringFields,
      ...booleanFields,
      'flags',
      ...floatFields,
      ...integerFields,
    ])
    floatFields.forEach((field) => {
      assertNullable(constraint[field], (value) => assert.strictEqual(typeof value, 'number'))
    })
    integerFields.forEach((field) => {
      assertNullable(constraint[field], (value) => assert.ok(Number.isSafeInteger(value)))
    })
    stringFields.forEach((field) => {
      assertNullable(constraint[field], (value) => assert.strictEqual(typeof value, 'string'))
    })
    booleanFields.forEach((field) => {
      assertNullable(constraint[field], (value) => assert.strictEqual(typeof value, 'boolean'))
    })
    assertNullable(constraint.flags, assertStringArray)
  })

  test('returns explicit nulls and preserves coordinates beyond the 32-bit range', async () => {
    const store = await openGeneStore(FIXTURE_ROOT)
    const gene = await store.fetchGeneById(TTTY6B_ID)

    assert.strictEqual(gene.gene_id, TTTY6B_ID)
    const nullFields = [
      'canonical_transcript_id',
      'mane_select_transcript',
      'pext',
      'gnomad_constraint',
      'omim_id',
      'previous_symbols',
      'preferred_transcript_id',
    ]
    nullFields.forEach((field) => {
      assert.ok(Object.hasOwn(gene, field), `Expected the ${field} property`)
      assert.strictEqual(gene[field], null, `${field} must be null, not undefined`)
    })
    assert.ok(Number.isSafeInteger(gene.xstart))
    assert.ok(Number.isSafeInteger(gene.xstop))
    assert.ok(gene.xstart > 4294967295, 'Encoded Y coordinates must not narrow to u32')
    assert.ok(gene.xstop > 4294967295, 'Encoded Y coordinates must not narrow to u32')
    assert.ok(gene.transcripts.length > 0)
    gene.transcripts.forEach((transcript) => {
      assert.strictEqual(transcript.refseq_id, null)
      assert.strictEqual(transcript.refseq_version, null)
    })
  })

  test('reuses one store for concurrent found and missing lookups', async () => {
    const store = await openGeneStore(FIXTURE_ROOT)
    const [pcsk9, missing, ttty6b] = await Promise.all([
      store.fetchGeneById(PCSK9_ID),
      store.fetchGeneById('ENSG00000000000'),
      store.fetchGeneById(TTTY6B_ID),
    ])

    assert.strictEqual(pcsk9.gene_id, PCSK9_ID)
    assert.strictEqual(missing, null)
    assert.strictEqual(ttty6b.gene_id, TTTY6B_ID)
  })

  test('propagates duplicate-ID errors instead of returning null', async (t) => {
    const root = await createTemporaryRoot(t)
    await copyGeneFixture(root, 'first.parquet')
    await copyGeneFixture(root, 'second.parquet')
    const store = await openGeneStore(root)

    await assert.rejects(
      () => store.fetchGeneById(PCSK9_ID),
      (error) => error.message.includes('Multiple gene records') && error.message.includes(PCSK9_ID)
    )
  })
})

describe('Gene store initialization', () => {
  test('opens genes without requiring ClinVar', async (t) => {
    const root = await createTemporaryRoot(t)
    await copyGeneFixture(root)
    const store = await openGeneStore(root)

    assert.strictEqual((await store.fetchGeneById(PCSK9_ID)).gene_id, PCSK9_ID)
    await assert.rejects(() => fs.stat(path.join(root, 'clinvar_variants_grch38')), {
      code: 'ENOENT',
    })
  })

  test('reports a missing requested dataset with its name and resolved path', async (t) => {
    const root = await createTemporaryRoot(t)
    const expectedPath = path.join(root, DATASET_NAME)

    await assert.rejects(
      () => openGeneStore(root),
      (error) => error.message.includes(DATASET_NAME) && error.message.includes(expectedPath)
    )
  })

  test('rejects a direct dataset path instead of treating it as the root', async () => {
    await assert.rejects(
      () => openGeneStore(FIXTURE_DIRECTORY),
      (error) => error.message.includes(path.join(FIXTURE_DIRECTORY, DATASET_NAME))
    )
  })

  test('propagates invalid-Parquet initialization errors with dataset context', async (t) => {
    const root = await createTemporaryRoot(t)
    const directory = path.join(root, DATASET_NAME)
    await fs.mkdir(directory)
    await fs.writeFile(path.join(directory, 'invalid.parquet'), 'not Parquet')

    await assert.rejects(
      () => openGeneStore(root),
      (error) => error.message.includes(DATASET_NAME) && error.message.includes(directory)
    )
  })
})

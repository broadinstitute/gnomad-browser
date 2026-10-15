/* eslint-disable no-param-reassign -- Synthetic test fixture pins the supplied receipt-like input. */
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { strContextDigest } from '../str_context_identity'
import type {
  StrContextSourceMapArtifacts,
  StrContextSourceMapReceiptLike,
} from '../str_context_source_map'

/** SYNTHETIC ONLY. Never use this helper to produce operator evidence for real data.
 * Writes invented metadata and operator assertions for isolated tests. Chooses
 * create-only mirror evidence for distinct identities, explicit direct_read for
 * identical identities. Updates synthetic capture map/receipt digests.
 * No receipt/projection is generated and no scientific verification is implied.
 */
export const writeSourceMapFixture = (
  directory: string,
  receiptLike: Omit<StrContextSourceMapReceiptLike, 'capture'> & {
    capture: Omit<StrContextSourceMapReceiptLike['capture'], 'source_map_sha256'> & {
      source_map_sha256?: string
    }
  },
  backendReceipt?: Record<string, unknown>
): { artifacts: StrContextSourceMapArtifacts; sourceMapSha256: string } => {
  const sha = (raw: string) => createHash('sha256').update(raw).digest('hex')
  const s = receiptLike.source
  const identity = (runtime: boolean) => {
    const uri = runtime ? s.runtime_uri : s.uri
    const generation = runtime ? s.runtime_generation : s.generation
    return {
      uri,
      generation,
      size_bytes: runtime ? s.runtime_byte_size : s.byte_size,
      md5_base64: runtime ? s.runtime_md5_base64 : s.md5_base64,
      crc32c_base64: 'AAAAAA==', // Invented test checksum, NOT checked object metadata.
      immutable_uri: `${uri}#${generation}`,
    }
  }
  const original = identity(false)
  const runtime = identity(true)
  const expectedRows = receiptLike.capture.physical_rows ?? 1
  const backend = backendReceipt ?? {
    contract: 'updated_histogram_source_v1',
    database: receiptLike.capture.database,
    cohort: receiptLike.cohort,
    run_id: receiptLike.run_id,
    task_id: receiptLike.capture.task_id,
    source_uri: runtime.uri,
    source_generation: runtime.generation,
    source_size_bytes: runtime.size_bytes,
    source_md5_base64: runtime.md5_base64,
    computed_md5_base64: runtime.md5_base64,
    status: 'complete_success',
    completeness: 'full',
    diagnostic: '',
    gcs_metadata_verified: true,
    eof_observed: true,
    complete_body_identity_verified: true,
    partial_writes_possible: false,
    bytes_read: runtime.size_bytes,
    data_rows_examined: expectedRows,
    validated_rows: expectedRows,
    rows_insert_attempted: expectedRows,
    rows_insert_acknowledged: expectedRows,
    zero_called_rows: 0,
  }
  receiptLike.capture.receipt_sha256 = strContextDigest(backend)
  const rawMap = JSON.stringify(
    {
      schema_version: 1,
      objects: [
        {
          cohort: receiptLike.cohort,
          original,
          runtime,
          expected_source_rows: expectedRows,
          verification: 'SYNTHETIC TEST ONLY: invented operator assertions',
        },
      ],
    },
    null,
    2
  )
  const sourceMapSha256 = sha(rawMap)
  const metadata = (kind: 'original' | 'runtime', i: typeof original) => {
    const slash = i.uri.indexOf('/', 5)
    const bucket = i.uri.slice(5, slash)
    const name = i.uri.slice(slash + 1)
    return {
      cohort: receiptLike.cohort,
      kind,
      pinned_generation_verified: true,
      metadata: {
        kind: 'storage#object',
        bucket,
        name,
        generation: i.generation,
        id: `${bucket}/${name}/${i.generation}`,
        mediaLink: `https://storage.googleapis.com/download/storage/v1/b/${bucket}/o/${encodeURIComponent(
          name
        )}?generation=${i.generation}&alt=media`,
        size: String(i.size_bytes),
        md5Hash: i.md5_base64,
        crc32c: i.crc32c_base64,
      },
    }
  }
  const direct = JSON.stringify(original) === JSON.stringify(runtime)
  const rawVerification = JSON.stringify(
    {
      schema_version: 2,
      verification_kind: 'str_context_source_map_operator_v2',
      source_map_sha256: sourceMapSha256,
      captures: [
        {
          cohort: receiptLike.cohort,
          database: receiptLike.capture.database,
          backend_receipt: backend,
          run_id: receiptLike.run_id,
          task_id: receiptLike.capture.task_id,
          receipt_sha256: receiptLike.capture.receipt_sha256,
          expected_source_rows: expectedRows,
          original,
          runtime,
          metadata: [metadata('original', original), metadata('runtime', runtime)],
          read_evidence: direct
            ? {
                kind: 'direct_read',
                immutable_uri: original.immutable_uri,
                status: 'success',
              }
            : {
                kind: 'create_only_mirror',
                source_immutable_uri: original.immutable_uri,
                destination_immutable_uri: runtime.immutable_uri,
                if_generation_match: '0',
                status: 'success',
              },
        },
      ],
    },
    null,
    2
  )
  mkdirSync(directory, { recursive: true })
  const suffix = randomUUID()
  const artifacts = {
    sourceMapPath: join(directory, `synthetic-source-map-${suffix}.json`),
    verificationPath: join(directory, `synthetic-operator-verification-${suffix}.json`),
    verificationSha256: sha(rawVerification),
  }
  writeFileSync(artifacts.sourceMapPath, rawMap)
  writeFileSync(artifacts.verificationPath, rawVerification)
  receiptLike.capture.source_map_sha256 = sourceMapSha256
  return { artifacts, sourceMapSha256 }
}

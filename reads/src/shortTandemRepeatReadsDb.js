const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')

const sqlite = require('sqlite')
const sqlite3 = require('sqlite3')

const logger = require('./logging')

// The tandem repeat reads DB is cached on the container's writable filesystem. It is deliberately
// not written to /readviz, which is a read-only persistent disk.
const CACHE_DIR = process.env.STR_READS_DB_CACHE_DIR || path.join(os.tmpdir(), 'gnomad-str-reads')

const DOWNLOAD_ATTEMPTS = 3
// Abort when the transfer makes no progress for this long, rather than capping its total duration:
// the DB is ~170MB, so a total-duration cap fails on any link slower than size/cap regardless of
// whether the transfer is healthy. Retrying a stalled download costs at most 3 * this + backoff,
// which stays inside the rollout's 600s progress deadline.
const DOWNLOAD_STALL_TIMEOUT_MS = 60_000
// Backstop for a transfer that keeps trickling bytes without ever finishing.
const DOWNLOAD_MAX_MS = 900_000

// Derive the cache file name from the URL rather than using a fixed name, so that pointing
// STR_READS_DB_URL at a new release can never be served from a stale cached file. The hash
// disambiguates releases that reuse a basename; the basename is kept so logs stay readable.
const cachePathForUrl = (dbUrl) => {
  const digest = crypto.createHash('sha256').update(dbUrl).digest('hex').slice(0, 12)
  return path.join(CACHE_DIR, `${digest}-${path.basename(new URL(dbUrl).pathname)}`)
}

const localDbPath = ({ dbPath, dbUrl }) => dbPath || cachePathForUrl(dbUrl)

const fetchToFile = async (dbUrl, destPath) => {
  const controller = new AbortController()
  let stallTimer = null
  const resetStallTimer = () => {
    clearTimeout(stallTimer)
    stallTimer = setTimeout(
      () => controller.abort(new Error('Download stalled')),
      DOWNLOAD_STALL_TIMEOUT_MS
    )
  }
  const maxTimer = setTimeout(
    () => controller.abort(new Error('Download exceeded its time limit')),
    DOWNLOAD_MAX_MS
  )
  resetStallTimer()

  try {
    const response = await fetch(dbUrl, { signal: controller.signal })
    if (!response.ok) {
      const error = new Error(`Request for ${dbUrl} returned ${response.status}`)
      error.isRetryable = response.status === 429 || response.status >= 500
      throw error
    }

    // Written next to the destination so that the rename below is a same-filesystem atomic operation.
    const tmpPath = `${destPath}.tmp-${process.pid}`
    try {
      const file = fs.createWriteStream(tmpPath)
      const body = Readable.fromWeb(response.body)
      body.on('data', resetStallTimer)
      // Streamed, never buffered: the container has a 256Mi memory limit and the DB is ~170MB.
      await pipeline(body, file)

      // Content-Length describes the stored bytes, so it only matches what we wrote when the
      // object is served with identity encoding. When the client decompresses a gzip-encoded
      // response the two legitimately differ, and a response without Content-Length gives us
      // nothing to compare against — skip the check in both cases rather than fail a good download.
      const contentLength = response.headers.get('content-length')
      if (contentLength !== null && !response.headers.get('content-encoding')) {
        const expectedBytes = Number(contentLength)
        if (expectedBytes !== file.bytesWritten) {
          throw new Error(
            `Expected ${expectedBytes} bytes from ${dbUrl}, but wrote ${file.bytesWritten}`
          )
        }
      }

      await fs.promises.rename(tmpPath, destPath)
    } catch (error) {
      await fs.promises.rm(tmpPath, { force: true })
      throw error
    }
  } finally {
    clearTimeout(stallTimer)
    clearTimeout(maxTimer)
  }
}

const verify = async (dbFilePath) => {
  const db = await sqlite.open({
    filename: dbFilePath,
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READONLY,
  })
  try {
    const { quick_check: quickCheck } = await db.get('PRAGMA quick_check')
    if (quickCheck !== 'ok') {
      throw new Error(`PRAGMA quick_check on ${dbFilePath} returned "${quickCheck}"`)
    }
    // quick_check would happily pass an unrelated database, so confirm the expected table exists.
    await db.get('SELECT 1 FROM `reads` LIMIT 1')
  } finally {
    await db.close()
  }
}

const downloads = new Map()

// Resolves once the DB is present on local disk and has passed its integrity checks. Memoized by
// path so that the r3 and r4 dataset entries, which share a DB, download it exactly once.
const ensureShortTandemRepeatReadsDb = (dataset) => {
  const dbFilePath = localDbPath(dataset)

  if (!downloads.has(dbFilePath)) {
    downloads.set(
      dbFilePath,
      (async () => {
        if (dataset.dbPath) {
          await fs.promises.access(dataset.dbPath, fs.constants.R_OK)
          logger.info(`Using tandem repeat reads DB at ${dataset.dbPath}`)
        } else if (fs.existsSync(dbFilePath)) {
          logger.info(`Reusing cached tandem repeat reads DB at ${dbFilePath}`)
        } else {
          await fs.promises.mkdir(path.dirname(dbFilePath), { recursive: true })

          for (let attempt = 1; ; attempt += 1) {
            try {
              logger.info(`Downloading ${dataset.dbUrl} (attempt ${attempt})`)
              // eslint-disable-next-line no-await-in-loop
              await fetchToFile(dataset.dbUrl, dbFilePath)
              break
            } catch (error) {
              // A 4xx other than 429 is a configuration error, so fail immediately rather than
              // spending the whole retry budget on a URL that will never work.
              if (attempt >= DOWNLOAD_ATTEMPTS || error.isRetryable === false) {
                throw error
              }
              logger.warn(error)
              // eslint-disable-next-line no-await-in-loop
              await new Promise((resolve) => {
                setTimeout(resolve, 2 ** attempt * 1000)
              })
            }
          }
        }

        await verify(dbFilePath)
        logger.info(`Tandem repeat reads DB ready at ${dbFilePath}`)

        return dbFilePath
      })()
    )
  }

  return downloads.get(dbFilePath)
}

const connections = new Map()

// One read-only handle per DB, opened on first use and kept for the life of the process. The
// promise itself is memoized so that concurrent first requests share a single open() rather than
// racing. OPEN_READONLY matters: the default mode would create an empty DB if the file were
// missing, turning a startup failure into a confusing per-request "no such table: reads".
const getShortTandemRepeatReadsDb = (dataset) => {
  const dbFilePath = localDbPath(dataset)

  if (!connections.has(dbFilePath)) {
    connections.set(
      dbFilePath,
      sqlite.open({
        filename: dbFilePath,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY,
      })
    )
  }

  return connections.get(dbFilePath)
}

module.exports = {
  ensureShortTandemRepeatReadsDb,
  getShortTandemRepeatReadsDb,
}

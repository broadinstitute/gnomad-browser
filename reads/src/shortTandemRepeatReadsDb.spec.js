const fs = require('fs')
const os = require('os')
const path = require('path')
const { Readable } = require('stream')

const sqlite = require('sqlite')
const sqlite3 = require('sqlite3')

jest.mock('./logging', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }))

let cacheDir
let fixtureDir

// A response whose body streams `content` once, mimicking the parts of fetch's Response that
// fetchToFile uses.
const mockResponse = (content, { status = 200, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: (name) => headers[name.toLowerCase()] ?? null,
  },
  body: Readable.toWeb(Readable.from([Buffer.from(content)])),
})

const okResponse = (content, extraHeaders = {}) =>
  mockResponse(content, {
    headers: { 'content-length': String(Buffer.byteLength(content)), ...extraHeaders },
  })

const writeFixtureDb = async (filePath, { withReadsTable = true } = {}) => {
  const db = await sqlite.open({ filename: filePath, driver: sqlite3.Database })
  if (withReadsTable) {
    await db.exec('CREATE TABLE `reads` (`id` varchar(10), `filename` char(47))')
    await db.exec("INSERT INTO `reads` VALUES ('EP400', 'abc.EP400.svg.gz')")
  } else {
    await db.exec('CREATE TABLE `other` (`id` varchar(10))')
  }
  await db.close()
}

// The module memoizes downloads and connections in module scope, so every test needs a fresh copy.
const loadModule = () => {
  let module
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    module = require('./shortTandemRepeatReadsDb')
  })
  return module
}

beforeEach(() => {
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'str-reads-cache-'))
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'str-reads-fixture-'))
  process.env.STR_READS_DB_CACHE_DIR = cacheDir
})

afterEach(() => {
  delete process.env.STR_READS_DB_CACHE_DIR
  fs.rmSync(cacheDir, { recursive: true, force: true })
  fs.rmSync(fixtureDir, { recursive: true, force: true })
  jest.restoreAllMocks()
})

describe('cache path derivation', () => {
  it('gives different URLs different local paths, so a new release is never served from cache', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()

    const dbPath = path.join(fixtureDir, 'str_reads.db')
    await writeFixtureDb(dbPath)
    const contents = fs.readFileSync(dbPath)

    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => okResponse(contents))

    await ensureShortTandemRepeatReadsDb({
      dbUrl: 'https://example.com/db/str_reads_2026_07_20.db',
    })
    await ensureShortTandemRepeatReadsDb({
      dbUrl: 'https://example.com/db/str_reads_2027_01_01.db',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const cached = fs.readdirSync(cacheDir).sort()
    expect(cached).toHaveLength(2)
    expect(cached[0]).toMatch(/^[0-9a-f]{12}-str_reads_20\d\d_\d\d_\d\d\.db$/)
  })
})

describe('dbPath', () => {
  it('serves a local file without fetching', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    const fetchMock = jest.spyOn(global, 'fetch')

    const dbPath = path.join(fixtureDir, 'str_reads.db')
    await writeFixtureDb(dbPath)

    await expect(ensureShortTandemRepeatReadsDb({ dbPath })).resolves.toBe(dbPath)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects when the local file is missing', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()

    await expect(
      ensureShortTandemRepeatReadsDb({ dbPath: path.join(fixtureDir, 'missing.db') })
    ).rejects.toThrow(/ENOENT/)
  })
})

describe('download', () => {
  let contents

  beforeEach(async () => {
    const dbPath = path.join(fixtureDir, 'str_reads.db')
    await writeFixtureDb(dbPath)
    contents = fs.readFileSync(dbPath)
  })

  it('skips the download when the cached file is already present', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => okResponse(contents))

    const dataset = { dbUrl: 'https://example.com/db/str_reads.db' }
    await ensureShortTandemRepeatReadsDb(dataset)

    const { ensureShortTandemRepeatReadsDb: ensureAgain } = loadModule()
    await ensureAgain(dataset)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('downloads once for two datasets that share a URL', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => okResponse(contents))

    const dbUrl = 'https://example.com/db/str_reads.db'
    await Promise.all([
      ensureShortTandemRepeatReadsDb({ dbUrl }),
      ensureShortTandemRepeatReadsDb({ dbUrl }),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  // A truncated transfer is treated as transient, so these two exhaust the retry budget
  // (2s + 4s of backoff) before rejecting. Hence the extended timeouts.
  it('leaves no partial file behind when the body errors mid-stream', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: Readable.toWeb(
        Readable.from(
          (function* body() {
            yield contents.subarray(0, 100)
            throw new Error('connection reset')
          })()
        )
      ),
    }))

    await expect(
      ensureShortTandemRepeatReadsDb({ dbUrl: 'https://example.com/db/str_reads.db' })
    ).rejects.toThrow(/connection reset/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fs.readdirSync(cacheDir)).toEqual([])
  }, 20000)

  it('rejects a truncated response whose length disagrees with Content-Length', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() =>
      mockResponse(contents, {
        headers: { 'content-length': String(contents.length + 1000) },
      })
    )

    await expect(
      ensureShortTandemRepeatReadsDb({ dbUrl: 'https://example.com/db/str_reads.db' })
    ).rejects.toThrow(/Expected \d+ bytes/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fs.readdirSync(cacheDir)).toEqual([])
  }, 20000)

  it('skips the size check when the response is transcoded, since Content-Length is the stored size', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      mockResponse(contents, {
        headers: {
          'content-length': String(Math.floor(contents.length / 30)),
          'content-encoding': 'gzip',
        },
      })
    )

    await expect(
      ensureShortTandemRepeatReadsDb({ dbUrl: 'https://example.com/db/str_reads.db' })
    ).resolves.toBeTruthy()
  })

  it('retries a 503 and succeeds', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    let calls = 0
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => {
      calls += 1
      return calls === 1 ? mockResponse('', { status: 503 }) : okResponse(contents)
    })

    await expect(
      ensureShortTandemRepeatReadsDb({ dbUrl: 'https://example.com/db/str_reads.db' })
    ).resolves.toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  }, 20000)

  it('does not retry a 404, which is a configuration error', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() => mockResponse('', { status: 404 }))

    await expect(
      ensureShortTandemRepeatReadsDb({ dbUrl: 'https://example.com/db/missing.db' })
    ).rejects.toThrow(/returned 404/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('verification', () => {
  it('rejects a file that is not a SQLite database', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()
    jest.spyOn(global, 'fetch').mockImplementation(() => okResponse('this is not a database'))

    await expect(
      ensureShortTandemRepeatReadsDb({ dbUrl: 'https://example.com/db/str_reads.db' })
    ).rejects.toThrow()
  })

  it('rejects a valid database that has no reads table', async () => {
    const { ensureShortTandemRepeatReadsDb } = loadModule()

    const dbPath = path.join(fixtureDir, 'other.db')
    await writeFixtureDb(dbPath, { withReadsTable: false })

    await expect(ensureShortTandemRepeatReadsDb({ dbPath })).rejects.toThrow(/no such table/)
  })
})

describe('getShortTandemRepeatReadsDb', () => {
  it('returns the same handle for repeated calls and opens it read-only', async () => {
    const { ensureShortTandemRepeatReadsDb, getShortTandemRepeatReadsDb } = loadModule()

    const dbPath = path.join(fixtureDir, 'str_reads.db')
    await writeFixtureDb(dbPath)
    await ensureShortTandemRepeatReadsDb({ dbPath })

    const [first, second] = await Promise.all([
      getShortTandemRepeatReadsDb({ dbPath }),
      getShortTandemRepeatReadsDb({ dbPath }),
    ])

    expect(first).toBe(second)
    await expect(first.exec("INSERT INTO `reads` VALUES ('X', 'x.svg.gz')")).rejects.toThrow(
      /readonly/
    )
  })
})

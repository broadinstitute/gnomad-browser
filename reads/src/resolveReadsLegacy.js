const path = require('path')

const sqlite = require('sqlite')
const sqlite3 = require('sqlite3')

const resolveReadsLegacy = async ({ readsDirectory, publicPath }, { alt, chrom, pos, ref }) => {
  const dbPath = path.join(
    readsDirectory,
    chrom,
    `combined_chr${chrom}_${`${pos % 1000}`.padStart(3, '0')}.db`
  )

  const db = await sqlite.open({
    filename: dbPath,
    driver: sqlite3.Database,
  })
  const rows = await db.all(
    'select n_expected_samples, n_available_samples, het_or_hom_or_hemi from t where chrom = ? and pos = ? and ref = ? and alt = ?',
    chrom,
    pos,
    ref,
    alt
  )
  await db.close()

  const bamPath = [
    publicPath,
    chrom,
    `combined_chr${chrom}_${`${pos % 1000}`.padStart(3, '0')}.bam`,
  ].join('/')

  const indexPath = `${bamPath}.bai`

  const reads = []

  // eslint-disable-next-line no-restricted-syntax
  for (const category of ['het', 'hom', 'hemi']) {
    const row = rows.find(r => r.het_or_hom_or_hemi === category)
    if (row) {
      for (let i = 0; i < row.n_available_samples; i += 1) {
        reads.push({
          bamPath,
          category,
          indexPath,
          readGroup: `${chrom}-${pos}-${ref}-${alt}_${category}${i}`,
        })
      }
    }
  }

  return reads
}

module.exports = resolveReadsLegacy

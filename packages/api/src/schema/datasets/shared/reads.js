import path from 'path'

import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import sqlite from 'sqlite'

export const ReadDataType = new GraphQLObjectType({
  name: 'ReadData',
  fields: {
    bamPath: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    indexPath: { type: new GraphQLNonNull(GraphQLString) },
    readGroup: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const resolveReads = async (readsRootDir, subDir, { alt, chrom, pos, ref }) => {
  const dbPath = path.join(
    readsRootDir,
    subDir,
    'combined_bams',
    chrom,
    `combined_chr${chrom}_${`${pos % 1000}`.padStart(3, '0')}.db`
  )

  const db = await sqlite.open(dbPath)
  const rows = await db.all(
    'select n_expected_samples, n_available_samples, het_or_hom_or_hemi from t where chrom = ? and pos = ? and ref = ? and alt = ?',
    chrom,
    pos,
    ref,
    alt
  )
  await db.close()

  const bamPath = [
    'reads',
    subDir,
    'combined_bams',
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

import path from 'path'

import { GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'
import sqlite from 'sqlite' // eslint-disable-line import/extensions

const ReadsCategoryType = new GraphQLObjectType({
  name: 'ReadsCategory',
  fields: {
    available: { type: GraphQLInt },
    expected: { type: GraphQLInt },
    readGroups: { type: new GraphQLList(GraphQLString) },
  },
})

export const ReadsType = new GraphQLObjectType({
  name: 'Reads',
  fields: {
    het: { type: ReadsCategoryType },
    hom: { type: ReadsCategoryType },
    hemi: { type: ReadsCategoryType },
    bamPath: { type: GraphQLString },
    indexPath: { type: GraphQLString },
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

  const reads = {
    bamPath,
    indexPath,
  }
  ;['het', 'hom', 'hemi'].forEach(category => {
    const row = rows.find(r => r.het_or_hom_or_hemi === category)
    if (!row) {
      reads[category] = {
        available: 0,
        expected: 0,
        readGroups: [],
      }
    } else {
      reads[category] = {
        available: row.n_available_samples,
        expected: row.n_expected_samples,
        readGroups: [...Array(row.n_available_samples)].map(
          (_, i) => `${chrom}-${pos}-${ref}-${alt}_${category}${i}`
        ),
      }
    }
  })

  return reads
}

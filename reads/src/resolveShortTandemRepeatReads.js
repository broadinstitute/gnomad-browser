const sqlite = require('sqlite')
const sqlite3 = require('sqlite3')

const { UserVisibleError } = require('./errors')

const buildWhere = ({ id, filter }) => {
  const params = {
    ':id': id,
  }

  let where = '`id` = :id AND `filename` IS NOT NULL'

  if (filter) {
    if (filter.population) {
      where += ' AND `population` = :population'
      params[':population'] = filter.population
    }

    if (filter.sex) {
      where += ' AND `sex` = :sex'
      params[':sex'] = filter.sex
    }

    if (filter.alleles && filter.alleles.length > 0) {
      if (filter.alleles.length > 2) {
        throw new UserVisibleError('Invalid alleles filter')
      }

      filter.alleles.forEach((alleleFilter) => {
        if (
          [alleleFilter.repeat_unit, alleleFilter.min_repeats, alleleFilter.max_repeats].every(
            (f) => !f
          )
        ) {
          throw new UserVisibleError('Invalid alleles filter')
        }
      })

      const allelesFilterParams = {}
      const allelesFilterWheres = filter.alleles.map((alleleFilter, alleleFilterIndex) => {
        // Each allele filter should have at least one of repeat unit, min repeats, max repeats.
        const alleleFilterWhereParts = []
        if (alleleFilter.repeat_unit) {
          alleleFilterWhereParts.push(
            `\`allele_ALLELE_INDEX_repeat_unit\` = :allele_filter_${alleleFilterIndex}_repeat_unit`
          )
          allelesFilterParams[`:allele_filter_${alleleFilterIndex}_repeat_unit`] =
            alleleFilter.repeat_unit
        }

        if (alleleFilter.min_repeats) {
          alleleFilterWhereParts.push(
            `\`allele_ALLELE_INDEX_repeats\` >= :allele_filter_${alleleFilterIndex}_min_repeats`
          )
          allelesFilterParams[`:allele_filter_${alleleFilterIndex}_min_repeats`] =
            alleleFilter.min_repeats
        }

        if (alleleFilter.max_repeats) {
          alleleFilterWhereParts.push(
            `\`allele_ALLELE_INDEX_repeats\` <= :allele_filter_${alleleFilterIndex}_max_repeats`
          )
          allelesFilterParams[`:allele_filter_${alleleFilterIndex}_max_repeats`] =
            alleleFilter.max_repeats
        }

        return `(${alleleFilterWhereParts.join(' AND ')})`
      })

      if (filter.alleles.length === 1) {
        // If one allele filter is provided, check if either of the sample's alleles matches the filter.
        const allelesFilterWhere = [1, 2]
          .map((alleleIndex) => allelesFilterWheres[0].replace(/ALLELE_INDEX/g, alleleIndex))
          .join(' OR ')
        where += ` AND (${allelesFilterWhere})`
      } else if (filter.alleles.length === 2) {
        // If two allele filters are provided...
        // If the sample is heterozygous or homozygous, check that each of the sample's alleles matches one of the filters.
        // If the sample is hemizygous, check that the sample's one allele matches both filters. This is done because hemizygous samples
        // are represented as homozygous in the genotype distribution plot and we want to be able to select the hemizygous samples from
        // those bins in the plot.
        const allelesFilterWhereForTwoAlleles = [
          [1, 2],
          [2, 1],
        ]
          .map((alleleIndices) =>
            alleleIndices
              .map((alleleIndex, i) => allelesFilterWheres[i].replace(/ALLELE_INDEX/g, alleleIndex))
              .join(' AND ')
          )
          .map((c) => `(${c})`)
          .join(' OR ')

        const allelesFilterWhereForOneAllele = allelesFilterWheres
          .map((w) => w.replace(/ALLELE_INDEX/g, '1'))
          .join('AND ')

        where += ` AND (((${allelesFilterWhereForTwoAlleles}) AND \`n_alleles\` = 2) OR ((${allelesFilterWhereForOneAllele}) AND \`n_alleles\` = 1))`
      }
      Object.assign(params, allelesFilterParams)
    }
  }

  return { where, params }
}

const resolveShortTandemRepeatNumReads = async ({ dbPath }, { id, filter }) => {
  const { where, params } = buildWhere({ id, filter })

  const query = `SELECT COUNT(*) AS \`num_reads\` FROM \`reads\` WHERE ${where}`

  const db = await sqlite.open({
    filename: dbPath,
    driver: sqlite3.Database,
  })
  const result = await db.get(query, params)
  await db.close()

  return result.num_reads
}

const MAX_READS_PER_REQUEST = 1_000

const resolveShortTandemRepeatReads = async (
  { dbPath, publicPath },
  { id, filter },
  { limit = 10, offset = 0 }
) => {
  if (limit > MAX_READS_PER_REQUEST) {
    throw new UserVisibleError(`Limit must be <= ${MAX_READS_PER_REQUEST}`)
  }

  const { where, params } = buildWhere({ id, filter })

  const query = `
    SELECT
      \`id\`,
      \`order\`,
      \`n_alleles\`,
      \`allele_1_repeat_unit\`,
      \`allele_2_repeat_unit\`,
      \`allele_1_repeats\`,
      \`allele_1_repeats_ci_lower\`,
      \`allele_1_repeats_ci_upper\`,
      \`allele_2_repeats\`,
      \`allele_2_repeats_ci_lower\`,
      \`allele_2_repeats_ci_upper\`,
      \`population\`,
      \`sex\`,
      \`age\`,
      \`pcr_protocol\`,
      \`filename\`
    FROM
      \`reads\`
    WHERE
      ${where}
    ORDER BY \`order\`
    LIMIT :limit OFFSET :offset
  `

  Object.assign(params, {
    ':limit': limit,
    ':offset': offset,
  })

  const db = await sqlite.open({
    filename: dbPath,
    driver: sqlite3.Database,
  })
  const rows = await db.all(query, params)
  await db.close()

  return rows.map((row) => {
    return {
      alleles:
        row.n_alleles === 2
          ? [
              {
                repeat_unit: row.allele_1_repeat_unit,
                repeats: row.allele_1_repeats,
                repeats_confidence_interval: {
                  lower: row.allele_1_repeats_ci_lower,
                  upper: row.allele_1_repeats_ci_upper,
                },
              },
              {
                repeat_unit: row.allele_2_repeat_unit,
                repeats: row.allele_2_repeats,
                repeats_confidence_interval: {
                  lower: row.allele_2_repeats_ci_lower,
                  upper: row.allele_2_repeats_ci_upper,
                },
              },
            ]
          : [
              {
                repeat_unit: row.allele_1_repeat_unit,
                repeats: row.allele_1_repeats,
                repeats_confidence_interval: {
                  lower: row.allele_1_repeats_ci_lower,
                  upper: row.allele_1_repeats_ci_upper,
                },
              },
            ],
      population: row.population,
      sex: row.sex,
      age: row.age,
      pcr_protocol: row.pcr_protocol,
      path: `${publicPath}/${id}/${row.filename}`,
    }
  })
}

module.exports = {
  resolveShortTandemRepeatNumReads,
  resolveShortTandemRepeatReads,
}

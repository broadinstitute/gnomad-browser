export const coverageConfigClassic = (exomeCoverage, genomeCoverage) => [
  {
    color: 'rgb(70, 130, 180)',
    buckets: exomeCoverage,
    name: 'exome',
  },
  {
    color: 'rgb(115, 171, 61)',
    buckets: genomeCoverage,
    name: 'genome',
  },
]

export const coverageConfigNew = (exomeCoverage, genomeCoverage) => [
  {
    color: 'rgba(70, 130, 180, 0.7)',
    buckets: exomeCoverage,
    name: 'exome',
  },
  {
    color: 'rgba(115, 171, 61, 0.5)',
    buckets: genomeCoverage,
    name: 'genome',
  },
]

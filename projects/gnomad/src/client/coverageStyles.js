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
    color: 'rgb(70, 130, 180)',
    buckets: exomeCoverage,
    name: 'exome',
    opacity: 0.7,
  },
  {
    color: 'rgb(115, 171, 61)',
    buckets: genomeCoverage,
    name: 'genome',
    opacity: 0.5,
  },
]

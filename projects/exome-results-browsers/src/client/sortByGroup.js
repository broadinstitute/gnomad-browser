const sortByGroup = (results, groupConfig) =>
  results.sort((r1, r2) => {
    let i1 = groupConfig.options.indexOf(r1.analysis_group)
    if (i1 === -1) {
      i1 = Infinity
    }
    let i2 = groupConfig.options.indexOf(r2.analysis_group)
    if (i2 === -1) {
      i2 = Infinity
    }

    if (i1 < i2) {
      return -1
    }
    if (i1 > i2) {
      return 1
    }

    const label1 = groupConfig.labels[r1.analysis_group] || r1.analysis_group
    const label2 = groupConfig.labels[r2.analysis_group] || r2.analysis_group
    return label1.localeCompare(label2)
  })

export default sortByGroup

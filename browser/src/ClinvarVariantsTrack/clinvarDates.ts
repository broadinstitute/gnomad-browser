const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'long' })

// Dates in ClinVar date are formatted YYYY-MM-DD
// `dateString` is null when the API could not determine a ClinVar release date
// (e.g. no ClinVar data source is available in this environment).
export const formatClinvarDate = (dateString: string | null | undefined) => {
  if (!dateString) {
    return null
  }
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return dateFormatter.format(date)
}

export const clinvarReleaseDateSentence = (releaseDate: string | null | undefined): string => {
  const formattedDate = formatClinvarDate(releaseDate)
  return formattedDate
    ? `Data displayed here is from ClinVar's ${formattedDate} release.`
    : 'ClinVar release date is unavailable.'
}

export const clinvarReleaseDateClause = (releaseDate: string | null | undefined): string => {
  const formattedDate = formatClinvarDate(releaseDate)
  return formattedDate
    ? `Based on ClinVar's ${formattedDate} release`
    : 'ClinVar release date is unavailable'
}

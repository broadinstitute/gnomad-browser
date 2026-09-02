const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'long' })

const formatClinvarDate = (dateString: string): string => {
  try {
    // Dates in ClinVar date are formatted YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return dateFormatter.format(date)
  } catch (error) {
    return `Malformed date string: "${dateString}"`
  }
}

export default formatClinvarDate

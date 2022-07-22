const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'long' })

// Dates in ClinVar date are formatted YYYY-MM-DD
const formatClinvarDate = (dateString: any) => {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return dateFormatter.format(date)
}

export default formatClinvarDate

const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'long' })

const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const daysInMonth = (year: number, month: number): number => {
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month === 2 && isLeapYear(year) ? 29 : lengths[month - 1]
}

// ClinVar dates are formatted YYYY-MM-DD
const formatClinvarDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number)

  const isRealDate =
    year >= 1000 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)

  if (!isRealDate) {
    return `Malformed date string: "${dateString}"`
  }

  return dateFormatter.format(new Date(year, month - 1, day))
}

export default formatClinvarDate

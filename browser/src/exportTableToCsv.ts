export type CsvColumn<Row> = {
  label: string
  getValue: (row: Row) => string
}

export const escapeCsvValue = (value: string) =>
  value.includes(',') || value.includes('"') || value.includes("'")
    ? `"${value.replace('"', '""')}"`
    : value

export const serializeTableToCsv = <Row>(rows: Row[], columns: CsvColumn<Row>[]) => {
  const headerRow = columns.map((column) => column.label).join(',')

  return `${headerRow}\r\n${rows
    .map((row) =>
      columns
        .map((column) => column.getValue(row))
        .map(escapeCsvValue)
        .join(',')
    )
    .join('\r\n')}\r\n`
}

export const formatCsvExportTimestamp = (date: Date) =>
  `${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}_${date
    .getDate()
    .toString()
    .padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}_${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}_${date.getSeconds().toString().padStart(2, '0')}`

export const getCsvExportFileName = (baseFileName: string, date = new Date()) =>
  `${baseFileName.replace(/\s+/g, '_')}_${formatCsvExportTimestamp(date)}.csv`

export const exportTableToCsv = <Row>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  baseFileName: string
) => {
  const csv = serializeTableToCsv(rows, columns)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', getCsvExportFileName(baseFileName))
  link.onclick = () => {
    URL.revokeObjectURL(url)
    link.remove()
  }
  document.body.appendChild(link)
  link.click()
}

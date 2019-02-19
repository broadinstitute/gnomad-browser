const formatCell = value => {
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (value.includes(',') || value.includes('"') || value.includes("'")) {
    return `"${value.replace('"', '""')}"`
  }
  return value
}

const generateCSV = data => `${data.map(row => row.map(formatCell).join(',')).join('\r\n')}\r\n`

const downloadCSV = (data, baseFileName) => {
  const date = new Date()
  const timestamp = `${date.getFullYear()}_${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}_${date
    .getDate()
    .toString()
    .padStart(2, '0')}_${date
    .getHours()
    .toString()
    .padStart(2, '0')}_${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}_${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`

  const csv = generateCSV(data)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${baseFileName.replace(/\s+/g, '_')}_${timestamp}.csv`)
  link.onClick = () => {
    console.log('revoke')
    URL.revokeObjectURL(url)
    link.remove()
  }
  document.body.appendChild(link)
  link.click()
}

export default downloadCSV

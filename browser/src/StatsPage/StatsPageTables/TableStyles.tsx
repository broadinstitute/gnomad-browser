import html2canvas from 'html2canvas'
import styled from 'styled-components'

export const downloadTableAsPNG = (elementID: string) => {
  const table = document.getElementById(elementID)

  if (table) {
    html2canvas(table).then((canvas) => {
      const link = document.createElement('a')
      link.download = `${elementID}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }
}

export const StatsTable = styled.table`
  border-collapse: collapse;
  min-width: 400px;
  font-size: 0.9em;

  /* non-zero letter spacing fixes html2canvas rendering errors */
  letter-spacing: 0.01px;

  th,
  td {
    padding: 12px 15px;
    text-align: center;
  }
`

export const StatsTableHeaderRow = styled.tr`
  background-color: #0e6fbf;
  color: #fafafa;

  th {
    font-weight: bold;
  }
`

export const StatsTableSubHeaderRow = styled.tr`
  /* background-color: #95d3ea; */
  background-color: #41a2f1;
  color: #fafafa;

  th {
    font-weight: normal;
  }
`

export const StatsTableFooter = styled.tfoot`
  tr {
    background-color: #508a14;
    color: #fafafa;
  }

  td {
    font-weight: bold;
  }
`

export const StatsTableBody = styled.tbody`
  tr {
    border-bottom: 1px solid #ddd;
    text-align: center;
  }

  tr:nth-of-type(even) {
    background-color: #f3f3f3;
  }
`

export const StatsTableCaption = styled.caption`
  caption-side: bottom;
  text-align: left;
`

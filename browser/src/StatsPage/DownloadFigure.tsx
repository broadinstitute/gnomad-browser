import html2canvas from 'html2canvas'
import React from 'react'
// @ts-expect-error
import DownloadIcon from '@fortawesome/fontawesome-free/svgs/solid/file-download.svg'
import styled from 'styled-components'

export const downloadElementAsPNG = (elementID: string): void => {
  const figure = document.getElementById(elementID)

  if (figure) {
    html2canvas(figure).then((canvas) => {
      const link = document.createElement('a')
      link.download = `gnomad_${elementID}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    })
  }
}

const Button = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-self: center;
  outline: none;
  padding-left: 7px;
  border: none;
  background: none;
  cursor: pointer;

  img {
    position: relative;
    top: 0.13em;
    width: 14px;
    height: 14px;
    border-radius: 2px;
  }

  &:focus img {
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }
`

export const DownloadElementAsPNGButton = ({ elementId }: { elementId: string }) => {
  return (
    <span>
      <Button onClick={() => downloadElementAsPNG(elementId)}>
        <img alt="Download figure" src={DownloadIcon} height={15} width={15} />
      </Button>
    </span>
  )
}

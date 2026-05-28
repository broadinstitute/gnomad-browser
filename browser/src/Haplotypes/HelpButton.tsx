import React, { useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import { Modal } from '@gnomad/ui'

// @ts-expect-error TS(2307)
import QuestionMarkIcon from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'

// react-aria-modal renders a portal with z-index: 1 (from @gnomad/ui zIndices).
// This is too low — sticky headers and DeckGL canvases overlay it.
// Override the portal's underlay z-index when our modal is open.
const ModalZIndexFix = createGlobalStyle`
  [data-reach-dialog-overlay],
  [class*="ReactModal"],
  div[style*="position: fixed"][style*="z-index: 1"] {
    z-index: 10000 !important;
  }
`

const Button = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-items: center;
  padding: 0 3px;
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
  img {
    position: relative;
    top: 0.13em;
    width: 14px;
    height: 14px;
    border-radius: 7px;
  }
  &:hover img { opacity: 0.7; }
  &:focus img { box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5); }
`

type Props = {
  title: string
  children: React.ReactNode
}

const HaplotypeHelpButton = ({ title, children }: Props) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <img src={QuestionMarkIcon} alt="" aria-hidden="true" />
      </Button>
      {isOpen && (
        <>
          <ModalZIndexFix />
          {/* @ts-ignore */}
          <Modal title={title} size="large" onRequestClose={() => setIsOpen(false)}>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              {children}
            </div>
          </Modal>
        </>
      )}
    </>
  )
}

export default HaplotypeHelpButton

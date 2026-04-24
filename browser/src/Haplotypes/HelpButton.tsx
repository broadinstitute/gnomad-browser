import React, { useState } from 'react'
import styled from 'styled-components'
import { Modal } from '@gnomad/ui'

// @ts-expect-error TS(2307)
import QuestionMarkIcon from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'

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
        // @ts-ignore
        <Modal title={title} size="large" onRequestClose={() => setIsOpen(false)}>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            {children}
          </div>
        </Modal>
      )}
    </>
  )
}

export default HaplotypeHelpButton

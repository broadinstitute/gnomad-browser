import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { Button } from '@gnomad/ui'

// Styled components matching @gnomad/ui modal styles
const ModalBody = styled.div`
  padding: 1rem;
`

const mediumScreenMaxWidth = {
  small: 300,
  medium: 500,
  large: 500,
  xlarge: 500,
}

const largeScreenMaxWidth = {
  small: 300,
  medium: 500,
  large: 800,
  xlarge: 800,
}

const extraLargeScreenMaxWidth = {
  small: 300,
  medium: 500,
  large: 800,
  xlarge: 1360,
}

const ModalContent = styled.div<{ size: 'small' | 'medium' | 'large' | 'xlarge' }>`
  width: calc(100vw - 2em);
  border: 1px solid #c8c8c8;
  border-radius: 5px;
  background: #fafafa;
  font-size: 1rem;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;

  @media (min-width: 576px) {
    max-width: ${(props) => mediumScreenMaxWidth[props.size]}px;
  }
  @media (min-width: 992px) {
    max-width: ${(props) => largeScreenMaxWidth[props.size]}px;
  }
  @media (min-width: 1400px) {
    max-width: ${(props) => extraLargeScreenMaxWidth[props.size]}px;
  }
`

const ModalFooter = styled.footer`
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid #e9ecef;
`

const ModalHeader = styled.header`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
`

const ModalTitle = styled.h2`
  margin: 0;
`

const ModalHeaderCloseButton = styled.button`
  padding: 1rem;
  border: none;
  margin: -1rem -1rem -1rem auto;
  appearance: none;
  background: none;
  color: #0008;
  cursor: pointer;
  font-size: 16px;

  &:focus {
    color: #000;
  }

  &:hover {
    color: #000;
  }
`

// Overlay that covers the entire chat area
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
  padding: 2em 0;
  box-sizing: border-box;
  overflow-y: auto;
`

interface ChatModalProps {
  id?: string
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  onRequestClose: () => void
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}

let nextId = 0
function getId() {
  const id = `${nextId}`
  nextId += 1
  return id
}

/**
 * Custom Modal component that renders within the chat container
 * using a portal. This ensures modals appear correctly when the
 * chat is in fullscreen or side panel mode.
 */
export const ChatModal: React.FC<ChatModalProps> = ({
  id,
  title,
  children,
  footer,
  onRequestClose,
  size = 'medium',
}) => {
  const modalId = id || `chat-modal-${getId()}`
  const modalRef = useRef<HTMLDivElement>(null)

  const renderedFooter =
    footer === undefined ? <Button onClick={onRequestClose}>Ok</Button> : footer

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRequestClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onRequestClose])

  // Focus the modal when it opens
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus()
    }
  }, [])

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onRequestClose()
    }
  }

  const modalContent = (
    <Overlay
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
    >
      <ModalContent
        className="modal-content"
        size={size}
        ref={modalRef}
        tabIndex={-1}
      >
        <ModalHeader>
          <ModalTitle id={`${modalId}-title`}>{title}</ModalTitle>
          <ModalHeaderCloseButton
            aria-label="Close"
            onClick={onRequestClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </ModalHeaderCloseButton>
        </ModalHeader>
        <ModalBody>{children}</ModalBody>
        {renderedFooter && <ModalFooter>{renderedFooter}</ModalFooter>}
      </ModalContent>
    </Overlay>
  )

  // Render directly into document.body using a portal
  // This ensures the modal appears above everything
  return createPortal(modalContent, document.body)
}

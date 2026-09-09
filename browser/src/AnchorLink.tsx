// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import LinkIcon from '@fortawesome/fontawesome-free/svgs/solid/link.svg'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { showNotification } from './Notifications'

const AnchorLink = styled.a.attrs({ 'aria-hidden': 'true' })`
  position: absolute;
  transform: translate(-15px, calc(50% - 0.5em));
  display: flex;
  align-items: center;
  width: 15px;
  height: 1em;
  visibility: hidden;
  vertical-align: middle;
`

const AnchorWrapper = styled.span`
  position: relative;

  :hover {
    ${AnchorLink} {
      visibility: visible;
    }
  }
`

export const withAnchor = (Component: any) => {
  const ComposedComponent = ({ children, id, ...props }: any) => (
    <AnchorWrapper>
      <Component {...props}>
        <AnchorLink href={`#${id}`} id={id}>
          <img src={LinkIcon} alt="" aria-hidden="true" height={12} width={12} />
        </AnchorLink>
        {children}
      </Component>
    </AnchorWrapper>
  )
  const componentName = Component.displayName || Component.name || 'Component'
  ComposedComponent.displayName = `withAnchor(${componentName})`
  ComposedComponent.propTypes = {
    children: PropTypes.node.isRequired,
    id: PropTypes.string.isRequired,
  }
  return ComposedComponent
}

const Heading = styled.h2`
  position: relative;
`

const SectionLink = styled.a`
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(-29px, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  opacity: 0;
  vertical-align: middle;

  /* stylelint-disable selector-type-no-unknown */
  :hover,
  :focus,
  :focus-visible,
  ${Heading}:hover &,
  ${Heading}:focus-within & {
    opacity: 1;
  }
  /* stylelint-enable selector-type-no-unknown */

  :focus,
  :focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -8px;
  }

  @media (hover: none) {
    opacity: 1;
  }

  /* Without the centered page's outer gutter, reserve inline space for the full target. */
  @media (max-width: 1230px) {
    position: static;
    transform: none;
    display: inline-flex;
  }
`

// Clipboard failures must not suppress the link's default fragment navigation.
const copySectionLink = async (id: string) => {
  try {
    const clipboard = navigator.clipboard
    if (!clipboard || !clipboard.writeText) {
      throw new Error('Clipboard API unavailable')
    }

    const sectionUrl = new URL(window.location.href)
    sectionUrl.hash = id
    await clipboard.writeText(sectionUrl.toString())
    showNotification({ title: 'Link copied', status: 'success' })
  } catch {
    showNotification({ title: 'Unable to copy link', status: 'error' })
  }
}

type SectionHeadingProps = Omit<
  React.ComponentPropsWithoutRef<'h2'>,
  'id' | 'title' | 'children'
> & {
  id: string
  title: string
  // Reserve the full hit area when there is not enough space around the heading.
  inlineLink?: boolean
  children?: React.ReactNode
}

export const SectionHeading = ({
  id,
  title,
  inlineLink = false,
  children,
  ...props
}: SectionHeadingProps) => (
  <Heading {...props} id={id}>
    <SectionLink
      style={
        inlineLink ? { position: 'static', transform: 'none', display: 'inline-flex' } : undefined
      }
      href={`#${id}`}
      aria-label={`Copy link to ${title}`}
      onClick={() => {
        copySectionLink(id)
      }}
    >
      <img src={LinkIcon} alt="" aria-hidden="true" height={12} width={12} />
    </SectionLink>
    {title}
    {children && <> {children}</>}
  </Heading>
)

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

// The link still navigates, so the address bar updates either way. Copying is a convenience on
// top of that, and is skipped where the Clipboard API is unavailable.
export const copyLinkToSection = (id: string) => {
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    return
  }

  const { origin, pathname, search } = window.location
  navigator.clipboard.writeText(`${origin}${pathname}${search}#${id}`).then(
    () => {
      showNotification({ title: 'Link copied', status: 'success' })
    },
    () => {
      showNotification({ title: 'Unable to copy link', status: 'error' })
    }
  )
}

export const withAnchor = (Component: any) => {
  const ComposedComponent = ({ children, id, copyUrlOnClick, ...props }: any) => (
    <AnchorWrapper>
      <Component {...props}>
        <AnchorLink
          href={`#${id}`}
          id={id}
          onClick={
            copyUrlOnClick
              ? () => {
                  copyLinkToSection(id)
                }
              : undefined
          }
        >
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
    copyUrlOnClick: PropTypes.bool,
  }
  ComposedComponent.defaultProps = {
    copyUrlOnClick: false,
  }
  return ComposedComponent
}

const SectionHeadingWithAnchor = withAnchor(styled.h2``)

export const AnchoredSectionHeading = (props: any) => (
  <SectionHeadingWithAnchor {...props} copyUrlOnClick />
)

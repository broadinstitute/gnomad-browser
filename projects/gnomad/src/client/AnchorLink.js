import LinkIcon from '@fortawesome/fontawesome-free/svgs/solid/link.svg'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

const AnchorLink = styled.a.attrs({ 'aria-hidden': 'true' })`
  position: absolute;
  top: 0;
  left: -15px;
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

export const withAnchor = Component => {
  const ComposedComponent = ({ children, id }) => (
    <AnchorWrapper>
      <Component>
        <AnchorLink href={`#${id}`} id={id}>
          <LinkIcon height={12} width={12} />
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

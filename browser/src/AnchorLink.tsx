// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import LinkIcon from '@fortawesome/fontawesome-free/svgs/solid/link.svg'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

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
  // theme was added as an additional prop to allow for conditional styling
  //   of a given styled component as the 'Component' parameter. The theme prop
  //   is a keyword with Styled Components and allows the table of contents to
  //   dynamically grab all '<SectionTitles> from a page to use in the ToC, while
  //   still allowing each <SectionTitle> to render differently.
  const ComposedComponent = ({ children, id, theme }: any) => (
    <AnchorWrapper>
      <Component theme={theme}>
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

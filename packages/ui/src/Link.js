import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

export const Link = styled.a`
  color: #428bca;
  text-decoration: none;

  &:active,
  &:hover {
    color: #be4248;
  }

  &:focus {
    text-decoration: underline;
  }

  &:visited {
    color: #428bca;
  }
`

export const ExternalLink = props => {
  const { children, ...rest } = props
  return (
    <Link {...rest} rel="noopener" target="_blank">
      {children}
    </Link>
  )
}

ExternalLink.propTypes = {
  children: PropTypes.node.isRequired,
}

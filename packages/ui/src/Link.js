import styled from 'styled-components'

export const Link = styled.a`
  color: #1173bb;
  text-decoration: none;

  &:visited,
  &:active {
    color: #1173bb;
  }

  &:focus,
  &:hover {
    text-decoration: underline;
  }
`

export const ExternalLink = styled(Link).attrs({
  rel: 'noopener noreferrer',
  target: '_blank',
})`
  /* stylelint-ignore-line block-no-empty */
`

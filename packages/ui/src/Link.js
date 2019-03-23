import styled from 'styled-components'

export const Link = styled.a`
  color: #428bca;
  text-decoration: none;

  &:visited {
    color: #428bca;
  }

  &:active,
  &:hover {
    color: #be4248;
  }

  &:focus {
    text-decoration: underline;
  }
`

export const ExternalLink = styled(Link).attrs({
  rel: 'noopener noreferrer',
  target: '_blank',
})`
  /* stylelint-ignore-line block-no-empty */
`

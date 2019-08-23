import styled from 'styled-components'

import zIndices from '../zIndices'

const BACKGROUND_COLOR = '#474747'

const ARROW_HEIGHT = 4
const ARROW_WIDTH = 8

export const Container = styled.div`
  position: relative;
  z-index: ${zIndices.tooltip};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 400px;
  padding: 0.5em;
  margin: ${ARROW_HEIGHT}px;
  background-color: ${BACKGROUND_COLOR};
  border-radius: 3px;
  color: #fff;
  font-family: Roboto, sans-serif;
  font-size: 13px;

  @media (max-width: 500px) {
    max-width: 300px;
  }
`

export const Arrow = styled.div`
  position: absolute;
  width: ${ARROW_WIDTH}px;
  height: ${ARROW_WIDTH}px;

  &::before {
    content: '';
    display: block;
    width: 0;
    height: 0;
    margin: auto;
    border-style: solid;
  }

  &[data-placement*='bottom'] {
    top: 0;
    left: 0;
    width: ${ARROW_WIDTH}px;
    height: ${ARROW_HEIGHT}px;
    margin-top: -${ARROW_HEIGHT}px;

    &::before {
      border-color: transparent transparent ${BACKGROUND_COLOR} transparent;
      border-width: 0 ${ARROW_WIDTH / 2}px ${ARROW_HEIGHT}px ${ARROW_WIDTH / 2}px;
    }
  }

  &[data-placement*='top'] {
    bottom: 0;
    left: 0;
    width: ${ARROW_WIDTH}px;
    height: ${ARROW_HEIGHT}px;
    margin-bottom: -${ARROW_HEIGHT}px;

    &::before {
      border-color: ${BACKGROUND_COLOR} transparent transparent transparent;
      border-width: ${ARROW_HEIGHT}px ${ARROW_WIDTH / 2}px 0 ${ARROW_WIDTH / 2}px;
    }
  }

  &[data-placement*='right'] {
    left: 0;
    width: ${ARROW_HEIGHT}px;
    height: ${ARROW_WIDTH}px;
    margin-left: -${ARROW_HEIGHT}px;

    &::before {
      border-color: transparent ${BACKGROUND_COLOR} transparent transparent;
      border-width: ${ARROW_WIDTH / 2}px ${ARROW_HEIGHT}px ${ARROW_WIDTH / 2}px 0;
    }
  }

  &[data-placement*='left'] {
    right: 0;
    width: ${ARROW_HEIGHT}px;
    height: ${ARROW_WIDTH}px;
    margin-right: -${ARROW_HEIGHT}px;

    &::before {
      border-color: transparent transparent transparent ${BACKGROUND_COLOR};
      border-width: ${ARROW_WIDTH / 2}px 0 ${ARROW_WIDTH / 2}px ${ARROW_HEIGHT}px;
    }
  }
`

import styled from 'styled-components'


const BACKGROUND_COLOR = '#474747'

const ARROW_HEIGHT = 4
const ARROW_WIDTH = 8


export const Container = styled.div`
  align-items: center;
  background-color: ${BACKGROUND_COLOR};
  border-radius: 3px;
  color: #fff;
  display: flex;
  flex-direction: column;
  font-family: Roboto, sans-serif;
  font-size: 13px;
  justify-content: center;
  margin: ${ARROW_HEIGHT}px;
  padding: 0.5em;
  position: relative;
  z-index: 2;
`


export const Arrow = styled.div`
  position: absolute;
  height: ${ARROW_WIDTH}px;
  width: ${ARROW_WIDTH}px;

  &::before {
    border-style: solid;
    content: '';
    display: block;
    height: 0;
    margin: auto;
    width: 0;
  }

  &[data-placement*="bottom"] {
    left: 0;
    top: 0;
    height: ${ARROW_HEIGHT}px;
    width: ${ARROW_WIDTH}px;
    margin-top: -${ARROW_HEIGHT}px;
    &::before {
      border-color: transparent transparent ${BACKGROUND_COLOR} transparent;
      border-width: 0 ${ARROW_WIDTH / 2}px ${ARROW_HEIGHT}px ${ARROW_WIDTH / 2}px;
    }
  }

  &[data-placement*="top"] {
    bottom: 0;
    left: 0;
    height: ${ARROW_HEIGHT}px;
    width: ${ARROW_WIDTH}px;
    margin-bottom: -${ARROW_HEIGHT}px;
    &::before {
      border-color: ${BACKGROUND_COLOR} transparent transparent transparent;
      border-width: ${ARROW_HEIGHT}px ${ARROW_WIDTH / 2}px 0 ${ARROW_WIDTH / 2}px;
    }
  }

  &[data-placement*="right"] {
    left: 0;
    height: ${ARROW_WIDTH}px;
    width: ${ARROW_HEIGHT}px;
    margin-left: -${ARROW_HEIGHT}px;
    &::before {
      border-color: transparent ${BACKGROUND_COLOR} transparent transparent;
      border-width: ${ARROW_WIDTH / 2}px ${ARROW_HEIGHT}px ${ARROW_WIDTH / 2}px 0;
    }
  }

  &[data-placement*="left"] {
    right: 0;
    height: ${ARROW_WIDTH}px;
    width: ${ARROW_HEIGHT}px;
    margin-right: -${ARROW_HEIGHT}px;
    &::before {
      border-color: transparent transparent transparent ${BACKGROUND_COLOR};
      border-width: ${ARROW_WIDTH / 2}px 0 ${ARROW_WIDTH / 2}px ${ARROW_HEIGHT}px;
    }
  }
`

import styled from 'styled-components'

export const ControlPanel = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  width: ${(props: any) => props.width}px;
  margin-left: ${(props: any) => props.marginLeft}px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    margin-left: 0;
  }
`

export const Legend = styled.ul`
  display: flex;
  flex-direction: row;
  padding: 0;
  margin: 0.5em 0;
  list-style-type: none;
`

export const LegendItemWrapper = styled.li`
  display: flex;
  align-items: stretch;
  margin-left: 1em;
`

export const Label = styled.label`
  user-select: none;
  display: flex;
  flex-direction: row;
  align-items: center;
`

export const CheckboxInput = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 0.5em;
`

export const LegendSwatch = styled.span`
  display: flex;
  align-items: center;
  width: 16px;
  margin-left: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: ${(props: any) => props.height}px;
    background: ${(props: any) => props.color};
  }
`

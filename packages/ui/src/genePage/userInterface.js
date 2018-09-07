import styled from 'styled-components'

export const SectionTitle = styled.h1`
  margin-bottom: 10px;
  margin-top: 15px;
  font-size: 18px;
  width: 100%;
  @media (max-width: 900px) {
    padding-left: 0;
    text-align: center;
    margin-top: 20px;
    margin-bottom: 15px;
    font-size: 22px;
  }
`

export const GenePage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #FAFAFA;
  color: black;
  margin-top: 40px;
  ${'' /* border: 5px solid yellow; */}
  width: 100%;
  flex-shrink: 0;
  @media (max-width: 900px) {
    padding-left: 0;
    align-items: center;
    margin-top: 80px;
  }
`

export const Summary = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 90%;
  margin-bottom: 10px;
  ${'' /* border: 5px solid blue; */}

  @media (max-width: 900px) {
    padding-left: 0;
    align-items: center;
    justify-content: center;
  }
`

export const TableSection = styled.div`
  width: calc(80% + 40px);
  margin: 0 auto 25px;
`

export const SettingsContainer = styled.div`
  width: 100%;
`

export const MenusContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 0;
  ${'' /* border: 1px solid green; */}
  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`

export const SearchContainer = styled.div`
  margin-left: 10px;
  margin-bottom: 5px;
  @media (max-width: 900px) {
    margin-top: 5px;
    margin-bottom: 5px;
  }
`

export const DataSelectionGroup = styled.div`
  margin: 0;
  display: flex;
  width: 50%;
  justify-content: space-around;
  align-items: center;
  ${'' /* border: 1px solid orange; */}
  @media (max-width: 900px) {
    flex-direction: row;
    justify-content: space-around;
    width: 90%;
  }
`

export const DataSelectionContainer = styled.div`
  ${'' /* margin-right: 20px; */}
  ${'' /* border: 1px solid blue; */}
  @media (max-width: 900px) {
  }
`

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

const SearchWrapper = styled.div`
  position: relative;
  left: 7px;
  font-size: 15px;
`

const SearchIconContainer = styled.span`
  position: absolute;
  left: 7px;
  font-size: 15px;
`

const SearchInput = styled.input`
  height: 25px;
  width: 210px;
  border: 0;
  border-bottom: 1px solid #000;
  background-color: transparent;
  /*margin-top: 2px;*/
  /*margin-right: 100px;*/
  text-indent: 5px;
  -webkit-transition: width 0.4s ease-in-out;
  transition: width 0.4s ease-in-out;
`

export const Search = ({
  listName,
  options,
  placeholder,
  onChange,
  reference,
}) => (
  <SearchWrapper>
    <SearchIconContainer>
      {/* <SearchIcon /> */}
    </SearchIconContainer>
    <form
      onChange={(event) => {
        event.preventDefault()
        onChange(event.target.value)
      }}
    >
      <SearchInput
        type="text"
        name="search"
        autoComplete="off"
        placeholder={placeholder}
        ref={input => reference = input}
        list={listName}
      />
      {/* <datalist id={listName}>
        {options.map(item => <option value={item} />)}
      </datalist> */}
    </form>
  </SearchWrapper>
)
Search.propTypes = {
  listName: PropTypes.string,
  // options: PropTypes.string,
  placeholder: PropTypes.string,
  // onSubmit: PropTypes.string,
}
Search.defaultProps = {
  listName: 'myList',
  options: ['first', 'second', 'third'],
  placeholder: 'placeholder',
  onSubmit: console.log,
}

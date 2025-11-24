import React from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from '@gnomad/ui'
import styled from 'styled-components'

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
`

const LoginPrompt = () => {
  const { loginWithRedirect } = useAuth0()

  return (
    <LoginContainer>
      <h3>Please log in to use the gnomAD Assistant.</h3>
      <Button onClick={() => loginWithRedirect()}>Log In</Button>
    </LoginContainer>
  )
}

export default LoginPrompt

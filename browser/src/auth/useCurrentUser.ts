import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

interface User {
  userId: string
  email?: string
  name?: string
  role?: 'user' | 'viewer' | 'admin'
  allowAdminViewing?: boolean
}

export const useCurrentUser = () => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      setUser(null)
      return
    }

    const fetchUser = async () => {
      setIsLoading(true)
      try {
        const token = await getAccessTokenSilently()
        const response = await fetch('/api/copilotkit/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`)
        }

        const userData = await response.json()
        setUser(userData)
        setError(null)
      } catch (e: any) {
        setError(e)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [isAuthenticated, getAccessTokenSilently])

  return { user, isLoading, error }
}

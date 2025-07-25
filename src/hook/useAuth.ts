import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getTokenFromStorage,
  setTokenInStorage,
  removeTokenFromStorage,
  isTokenExpired,
} from '../lib/jwt'

const API_BASE_URL = 'http://localhost:8000'

export type User = {
  id: string
  email: string
  created_at: string
  email_verified: boolean
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const hasCheckedUser = useRef(false)
  const isCheckingUser = useRef(false) // Prevent concurrent checks

  // Memoize the checkUser function to prevent recreation on every render
  const checkUser = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (hasCheckedUser.current || isCheckingUser.current) {
      console.log('Auth check already in progress or completed')
      return
    }
    
    isCheckingUser.current = true
    console.log('Starting auth check...')

    try {
      const storedToken = getTokenFromStorage()
      console.log('Stored token exists:', !!storedToken)
      
      if (storedToken && !isTokenExpired(storedToken)) {
        console.log('Token is valid, verifying with backend...')
        
        // Verify token with backend
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const userData = await response.json()
          console.log('Token verified successfully:', userData)
          
          setUser({
            id: userData.user_id || userData.email,
            email: userData.email,
            created_at: userData.created_at || new Date().toISOString(),
            email_verified: userData.email_verified || false,
          })
          setToken(storedToken)
        } else {
          console.log('Token verification failed, removing token')
          removeTokenFromStorage()
          setToken(null)
          setUser(null)
        }
      } else {
        console.log('No valid token found')
        setToken(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      removeTokenFromStorage()
      setToken(null)
      setUser(null)
    } finally {
      hasCheckedUser.current = true
      isCheckingUser.current = false
      setLoading(false)
      console.log('Auth check completed')
    }
  }, []) // Empty dependency array since we don't depend on any props or state

  useEffect(() => {
    console.log('useAuth useEffect triggered')
    checkUser()
  }, [checkUser]) // Only depend on the memoized checkUser function

  const registerUser = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (response.ok) {
        return { success: true, user: result }
      } else {
        return { success: false, error: result.detail || 'Registration failed' }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Network error during registration' }
    }
  }

  const loginWithPassword = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (response.ok) {
        const { access_token, user: userData } = result

        setTokenInStorage(access_token)
        setToken(access_token)
        setUser({
          id: userData.id || userData.email,
          email: userData.email,
          created_at: userData.created_at || new Date().toISOString(),
          email_verified: userData.email_verified || false,
        })

        // Mark as checked to prevent immediate re-check
        hasCheckedUser.current = true

        return { success: true, user: userData }
      } else {
        return { success: false, error: result.detail || 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error during login' }
    }
  }

  const sendVerificationCode = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        if (result.demo_code) {
          console.log(`🔐 DEMO: Verification code for ${email}: ${result.demo_code}`)
          alert(`Demo Mode: Your verification code is ${result.demo_code}`)
        }
        return { success: true }
      } else {
        return { success: false, error: result.detail || 'Failed to send verification code' }
      }
    } catch (error) {
      console.error('Verification error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  const verifyCodeAndLogin = async (email: string, code: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      })

      const result = await response.json()

      if (response.ok) {
        const { access_token, user: userData } = result

        setTokenInStorage(access_token)
        setToken(access_token)
        setUser({
          id: userData.id || userData.email,
          email: userData.email,
          created_at: userData.created_at || new Date().toISOString(),
          email_verified: userData.email_verified || false,
        })

        // Mark as checked to prevent immediate re-check
        hasCheckedUser.current = true

        return { success: true, user: userData }
      } else {
        return { success: false, error: result.detail || 'Verification failed' }
      }
    } catch (error) {
      console.error('Code verification failed:', error)
      return { success: false, error: 'Network error during verification' }
    }
  }

  const sendPasswordResetCode = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (response.ok) {
        if (result.demo_code) {
          console.log(`🔑 DEMO: Password reset code for ${email}: ${result.demo_code}`)
          alert(`Demo Mode: Your password reset code is ${result.demo_code}`)
        }
        return { success: true }
      } else {
        return { success: false, error: result.detail || 'Failed to send reset code' }
      }
    } catch (error) {
      console.error('Error sending reset code:', error)
      return { success: false, error: 'Network error' }
    }
  }

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          new_password: newPassword,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        return { success: true }
      } else {
        return { success: false, error: result.detail || 'Password reset failed' }
      }
    } catch (error) {
      console.error('Password reset error:', error)
      return { success: false, error: 'Network error during password reset' }
    }
  }

  const logout = useCallback(() => {
    console.log('Logging out...')
    removeTokenFromStorage()
    setToken(null)
    setUser(null)
    hasCheckedUser.current = false
    isCheckingUser.current = false
    setLoading(false)
  }, [])

  const isAuthenticated = useCallback((): boolean => {
    const result = !!token && !!user && !isTokenExpired(token)
    console.log('isAuthenticated check:', { token: !!token, user: !!user, result })
    return result
  }, [token, user])

  const getAuthHeaders = useCallback((): { Authorization: string } | {} => {
    if (token && !isTokenExpired(token)) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }, [token])

  return {
    user,
    token,
    loading,
    isAuthenticated,
    getAuthHeaders,
    registerUser,
    loginWithPassword,
    sendVerificationCode,
    verifyCodeAndLogin,
    sendPasswordResetCode,
    resetPassword,
    logout,
  }
}
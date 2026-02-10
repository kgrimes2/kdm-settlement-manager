import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { CognitoAuthService, type AuthUser } from '../utils/authService'
import { DataService } from '../utils/dataService'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  authService: CognitoAuthService | null
  dataService: DataService | null
  signUp: (email: string, password: string, username: string) => Promise<any>
  confirmSignUp: (username: string, verificationCode: string) => Promise<any>
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<any>
  forgotPassword: (username: string) => Promise<any>
  confirmPassword: (username: string, code: string, newPassword: string) => Promise<any>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
  userPoolId: string
  clientId: string
  region: string
  apiBaseUrl: string
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  userPoolId,
  clientId,
  region,
  apiBaseUrl,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authService] = useState(
    () =>
      new CognitoAuthService({
        userPoolId,
        clientId,
        region,
      })
  )
  const [dataService] = useState(() => new DataService(authService, apiBaseUrl))

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
        }
      } catch (err) {
        console.error('Error checking auth status:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [authService])

  const handleSignUp = async (email: string, password: string, username: string) => {
    try {
      setError(null)
      const result = await authService.signUp(email, password, username)
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Sign up failed'
      setError(errorMessage)
      throw err
    }
  }

  const handleConfirmSignUp = async (username: string, verificationCode: string) => {
    try {
      setError(null)
      const result = await authService.confirmSignUp(username, verificationCode)
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Confirmation failed'
      setError(errorMessage)
      throw err
    }
  }

  const handleSignIn = async (username: string, password: string) => {
    try {
      setError(null)
      await authService.signIn(username, password)
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
      } else {
        console.error('getCurrentUser returned null after successful login')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Sign in failed'
      console.error('Sign in error:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }

  const handleSignOut = async () => {
    try {
      setError(null)
      await authService.signOut()
      setUser(null)
    } catch (err: any) {
      const errorMessage = err.message || 'Sign out failed'
      setError(errorMessage)
      throw err
    }
  }

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    try {
      setError(null)
      const result = await authService.changePassword(oldPassword, newPassword)
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Password change failed'
      setError(errorMessage)
      throw err
    }
  }

  const handleForgotPassword = async (username: string) => {
    try {
      setError(null)
      const result = await authService.forgotPassword(username)
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Password reset request failed'
      setError(errorMessage)
      throw err
    }
  }

  const handleConfirmPassword = async (
    username: string,
    code: string,
    newPassword: string
  ) => {
    try {
      setError(null)
      const result = await authService.confirmPassword(username, code, newPassword)
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Password confirmation failed'
      setError(errorMessage)
      throw err
    }
  }

  const clearError = () => {
    setError(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    authService,
    dataService,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    changePassword: handleChangePassword,
    forgotPassword: handleForgotPassword,
    confirmPassword: handleConfirmPassword,
    error,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './LoginModal.css'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signIn, signUp, confirmSignUp, error, clearError } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    clearError()
    setLocalError(null)
    setEmail('')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setVerificationCode('')
    setMode('login')
    onClose()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (!username || !password) {
      setLocalError('Username and password are required')
      return
    }

    try {
      setIsLoading(true)
      await signIn(username, password)
      handleClose()
    } catch (err: any) {
      setLocalError(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (!email || !username || !password || !confirmPassword) {
      setLocalError('All fields are required')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (password.length < 12) {
      setLocalError('Password must be at least 12 characters')
      return
    }

    try {
      setIsLoading(true)
      await signUp(email, password, username)
      setMode('confirm')
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setLocalError(err.message || 'Sign up failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (!verificationCode) {
      setLocalError('Verification code is required')
      return
    }

    try {
      setIsLoading(true)
      await confirmSignUp(username, verificationCode)
      setLocalError(null)
      setMode('login')
      setEmail('')
      setVerificationCode('')
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setLocalError(err.message || 'Confirmation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const displayError = localError || error

  return (
    <div className="login-modal-backdrop">
      <div className="login-modal">
        <div className="login-modal-header">
          <h2>
            {mode === 'login' && 'Login'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'confirm' && 'Verify Email'}
          </h2>
          <button
            className="login-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {displayError && (
          <div className="login-error" role="alert">
            {displayError}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="login-form-group">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="login-divider">or</div>

            <button
              type="button"
              className="login-btn login-btn-secondary"
              onClick={() => {
                setMode('signup')
                clearError()
                setLocalError(null)
              }}
              disabled={isLoading}
            >
              Create Account
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="login-form">
            <div className="login-form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                disabled={isLoading}
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 12 chars, uppercase, lowercase, number, symbol"
                disabled={isLoading}
              />
            </div>

            <div className="login-form-group">
              <label htmlFor="signup-confirm-password">Confirm Password</label>
              <input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>

            <button
              type="button"
              className="login-btn login-btn-secondary"
              onClick={() => {
                setMode('login')
                clearError()
                setLocalError(null)
              }}
              disabled={isLoading}
            >
              Back to Login
            </button>
          </form>
        )}

        {mode === 'confirm' && (
          <form onSubmit={handleConfirm} className="login-form">
            <p className="login-confirm-text">
              We've sent a verification code to your email. Enter it below to confirm your account.
            </p>

            <div className="login-form-group">
              <label htmlFor="verification-code">Verification Code</label>
              <input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>

            <button
              type="button"
              className="login-btn login-btn-secondary"
              onClick={() => {
                setMode('signup')
                setVerificationCode('')
                clearError()
                setLocalError(null)
              }}
              disabled={isLoading}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

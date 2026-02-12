import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js'

export interface AuthConfig {
  userPoolId: string
  clientId: string
  region: string
}

export interface AuthUser {
  username: string
  email?: string
  attributes: Record<string, string>
}

export interface AuthTokens {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
}

export class CognitoAuthService {
  private userPool: CognitoUserPool

  constructor(config: AuthConfig) {
    // Validate configuration
    if (!config.userPoolId || config.userPoolId.trim() === '') {
      throw new Error('User Pool ID is required for authentication')
    }
    if (!config.clientId || config.clientId.trim() === '') {
      throw new Error('Client ID is required for authentication')
    }
    if (!config.region || config.region.trim() === '') {
      throw new Error('AWS Region is required for authentication')
    }

    // Validate User Pool ID format
    const poolIdPattern = /^[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]+$/
    if (!poolIdPattern.test(config.userPoolId)) {
      console.warn('User Pool ID format appears invalid:', config.userPoolId)
      console.warn('Expected format: region_randomstring (e.g., us-west-2_abc123DEF)')
    }

    console.log('Initializing Cognito Auth Service')
    console.log('Region:', config.region)
    console.log('User Pool ID:', config.userPoolId)
    console.log('Client ID:', config.clientId.substring(0, 8) + '...')

    this.userPool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
    })
  }

  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, username: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const attribute = new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      })
      
      this.userPool.signUp(
        username,
        password,
        [attribute],
        [],
        (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        }
      )
    })
  }

  /**
   * Confirm user sign up with verification code
   */
  async confirmSignUp(username: string, verificationCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool,
      })

      cognitoUser.confirmRegistration(
        verificationCode,
        true,
        (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        }
      )
    })
  }

  /**
   * Authenticate user with credentials
   */
  async signIn(username: string, password: string): Promise<AuthTokens> {
    return new Promise((resolve, reject) => {
      // Validate inputs before making request
      if (!username || username.trim() === '') {
        const error = new Error('Username cannot be empty')
        console.error('Sign in validation error:', error.message)
        reject(error)
        return
      }

      if (!password || password.trim() === '') {
        const error = new Error('Password cannot be empty')
        console.error('Sign in validation error:', error.message)
        reject(error)
        return
      }

      console.log('Attempting sign in for user:', username)
      console.log('User Pool ID:', this.userPool.getUserPoolId())
      console.log('Client ID:', this.userPool.getClientId())

      const cognitoUser = new CognitoUser({
        Username: username.trim(),
        Pool: this.userPool,
      })

      const authDetails = new AuthenticationDetails({
        Username: username.trim(),
        Password: password,
      })

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result) => {
          console.log('Authentication successful for user:', username)
          const tokens: AuthTokens = {
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
            expiresIn: result.getAccessToken().getExpiration(),
          }
          // Store tokens in localStorage
          localStorage.setItem('cognito_tokens', JSON.stringify(tokens))
          resolve(tokens)
        },
        onFailure: (err) => {
          console.error('Authentication failed for user:', username)
          console.error('Error code:', err.code)
          console.error('Error name:', err.name)
          console.error('Error message:', err.message)
          console.error('Full error:', JSON.stringify(err, null, 2))
          
          // Provide more user-friendly error messages
          let userMessage = err.message || 'Login failed'
          
          if (err.code === 'UserNotFoundException') {
            userMessage = 'User does not exist. Please check your username or sign up.'
          } else if (err.code === 'NotAuthorizedException') {
            userMessage = 'Incorrect username or password.'
          } else if (err.code === 'UserNotConfirmedException') {
            userMessage = 'Please verify your email address first.'
          } else if (err.code === 'InvalidParameterException') {
            userMessage = 'Invalid login parameters. Please check your input.'
          } else if (err.code === 'ResourceNotFoundException') {
            userMessage = 'Authentication service not configured correctly. Please contact support.'
          }
          
          const enhancedError = new Error(userMessage)
          Object.assign(enhancedError, { code: err.code, originalError: err })
          reject(enhancedError)
        },
      })
    })
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const cognitoUser = this.userPool.getCurrentUser()
      
      if (!cognitoUser) {
        return null
      }

      return new Promise((resolve, reject) => {
        // First, ensure session is valid
        cognitoUser.getSession((sessionErr: any, session: any) => {
          if (sessionErr) {
            console.error('Session error:', sessionErr)
            reject(sessionErr)
            return
          }

          if (!session || !session.isValid()) {
            console.error('Session is not valid')
            reject(new Error('Session is not valid'))
            return
          }

          // Now get user attributes
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              console.error('Error getting user attributes:', err)
              reject(err)
            } else {
              const attrs = attributes?.reduce(
                (acc, attr) => {
                  acc[attr.Name] = attr.Value
                  return acc
                },
                {} as Record<string, string>
              ) || {}

              const user = {
                username: cognitoUser.getUsername(),
                email: attrs.email,
                attributes: attrs,
              }
              resolve(user)
            }
          })
        })
      })
    } catch (error) {
      console.error('getCurrentUser error:', error)
      return null
    }
  }

  /**
   * Get valid access token
   */
  async getAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      const cognitoUser = this.userPool.getCurrentUser()
      if (!cognitoUser) {
        reject(new Error('No user logged in'))
        return
      }

      cognitoUser.getSession((err: any, session: any) => {
        if (err) {
          console.error('getSession error:', err)
          reject(err)
        } else if (!session || !session.isValid()) {
          console.error('Session is not valid:', session)
          reject(new Error('Session is not valid'))
        } else {
          // Use ID Token instead of Access Token for API Gateway Cognito authorizer
          const token = session.getIdToken().getJwtToken()
          resolve(token)
        }
      })
    })
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<AuthTokens> {
    return new Promise((resolve, reject) => {
      const cognitoUser = this.userPool.getCurrentUser()
      if (!cognitoUser) {
        reject(new Error('No user logged in'))
        return
      }

      cognitoUser.getSession((err: any, session: any) => {
        if (err) {
          reject(err)
        } else {
          cognitoUser.refreshSession(session.getRefreshToken(), (err, session) => {
            if (err) {
              reject(err)
            } else {
              const tokens: AuthTokens = {
                accessToken: session.getAccessToken().getJwtToken(),
                idToken: session.getIdToken().getJwtToken(),
                refreshToken: session.getRefreshToken().getToken(),
                expiresIn: session.getAccessToken().getExpiration(),
              }
              localStorage.setItem('cognito_tokens', JSON.stringify(tokens))
              resolve(tokens)
            }
          })
        }
      })
    })
  }

  /**
   * Sign out the user
   */
  async signOut(): Promise<void> {
    const cognitoUser = this.userPool.getCurrentUser()
    if (cognitoUser) {
      cognitoUser.signOut()
    }
    localStorage.removeItem('cognito_tokens')
  }

  /**
   * Change user password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const cognitoUser = this.userPool.getCurrentUser()
      if (!cognitoUser) {
        reject(new Error('No user logged in'))
        return
      }

      cognitoUser.getSession((err: any) => {
        if (err) {
          reject(err)
        } else {
          cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
            if (err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        }
      })
    })
  }

  /**
   * Forgot password flow
   */
  async forgotPassword(username: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool,
      })

      cognitoUser.forgotPassword({
        onSuccess: () => {
          resolve({ CodeDeliveryDetails: 'Check your email for the code' })
        },
        onFailure: (err) => {
          reject(err)
        },
      })
    })
  }

  /**
   * Confirm forgot password
   */
  async confirmPassword(
    username: string,
    verificationCode: string,
    newPassword: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool,
      })

      cognitoUser.confirmPassword(
        verificationCode,
        newPassword,
        {
          onSuccess: () => {
            resolve({ message: 'Password confirmed successfully' })
          },
          onFailure: (err) => {
            reject(err)
          },
        }
      )
    })
  }
}

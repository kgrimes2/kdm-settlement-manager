import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'

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
  private currentUser: CognitoUser | null = null

  constructor(config: AuthConfig) {
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
      this.userPool.signUp(
        username,
        password,
        [
          {
            Name: 'email',
            Value: email,
          },
        ],
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
      console.log('signIn called with username:', username)
      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: this.userPool,
      })

      const authDetails = new AuthenticationDetails({
        Username: username,
        Password: password,
      })

      console.log('Calling authenticateUser...')
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result) => {
          console.log('Authentication successful!')
          this.currentUser = cognitoUser
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
          console.error('Authentication failed:', err.message || err)
          reject(err)
        },
      })
    })
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log('getCurrentUser called')
      const cognitoUser = this.userPool.getCurrentUser()
      console.log('cognitoUser from pool:', cognitoUser ? cognitoUser.getUsername() : 'null')
      
      if (!cognitoUser) {
        console.log('No current user found')
        return null
      }

      return new Promise((resolve, reject) => {
        // First, ensure session is valid
        cognitoUser.getSession((sessionErr: any, session: any) => {
          console.log('getSession result:', { hasError: !!sessionErr, isValid: session?.isValid() })
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
              console.log('Got user attributes:', attributes)
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
              console.log('Resolved user:', user)
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
          reject(err)
        } else if (!session.isValid()) {
          reject(new Error('Session is not valid'))
        } else {
          resolve(session.getAccessToken().getJwtToken())
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

      cognitoUser.getSession((err: any, session: any) => {
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

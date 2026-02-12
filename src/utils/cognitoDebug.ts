/**
 * Cognito Debug Utilities
 * Use this to help diagnose authentication issues
 */

export function logCognitoConfig() {
  console.group('🔍 Cognito Configuration Debug')
  
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  const region = import.meta.env.VITE_COGNITO_REGION
  const apiUrl = import.meta.env.VITE_API_GATEWAY_URL

  console.log('User Pool ID:', userPoolId || '❌ MISSING')
  console.log('Client ID:', clientId || '❌ MISSING')
  console.log('Region:', region || '❌ MISSING')
  console.log('API Gateway URL:', apiUrl || '❌ MISSING')

  // Validate formats
  const poolIdPattern = /^[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]+$/
  const clientIdPattern = /^[a-z0-9]{20,}$/
  const regionPattern = /^[a-z]{2}-[a-z]+-\d$/

  if (userPoolId && !poolIdPattern.test(userPoolId)) {
    console.warn('⚠️ User Pool ID format appears invalid')
    console.warn('Expected format: us-west-2_abc123DEF')
  }

  if (clientId && !clientIdPattern.test(clientId)) {
    console.warn('⚠️ Client ID format appears invalid')
    console.warn('Expected: lowercase alphanumeric, 20+ characters')
  }

  if (region && !regionPattern.test(region)) {
    console.warn('⚠️ Region format appears invalid')
    console.warn('Expected format: us-west-2')
  }

  // Check Cognito endpoint
  if (region) {
    console.log('Cognito Endpoint:', `https://cognito-idp.${region}.amazonaws.com/`)
  }

  console.groupEnd()
}

export function validateCognitoRequest(username: string, password: string) {
  console.group('🔍 Login Request Validation')
  
  console.log('Username provided:', !!username)
  console.log('Username length:', username?.length || 0)
  console.log('Username trimmed:', username?.trim() || '')
  console.log('Password provided:', !!password)
  console.log('Password length:', password?.length || 0)
  
  const issues: string[] = []
  
  if (!username || username.trim() === '') {
    issues.push('Username is empty or whitespace only')
  }
  
  if (!password || password.trim() === '') {
    issues.push('Password is empty or whitespace only')
  }
  
  if (username && username !== username.trim()) {
    issues.push('Username has leading/trailing whitespace')
  }
  
  if (issues.length > 0) {
    console.error('❌ Validation Issues:', issues)
  } else {
    console.log('✅ Request validation passed')
  }
  
  console.groupEnd()
  
  return issues
}

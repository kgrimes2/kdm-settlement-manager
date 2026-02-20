import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { errorTracker } from './utils/errorTracking'

// Polyfill for amazon-cognito-identity-js which requires global object
declare global {
  var global: typeof globalThis
}

if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis
}

// Initialize error tracking before React renders
errorTracker.init()

// Make error tracker globally available for debug submissions
window.__errorTracker = errorTracker

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

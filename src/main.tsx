import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Polyfill for amazon-cognito-identity-js which requires global object
declare global {
  var global: typeof globalThis
}

if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { cleanupObsoleteStorage } from './utils/storageCleanup'

// Limpa dados locais redundantes e pesados (Base64) antes da renderização
cleanupObsoleteStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


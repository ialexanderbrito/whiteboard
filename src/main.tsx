import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { cleanupObsoleteStorage } from './utils/storageCleanup';

// Limpa dados locais redundantes e pesados (Base64) antes da renderização
cleanupObsoleteStorage();

// Registra Service Worker para PWA instalável e cache rápido de assets estáticos em produção
if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

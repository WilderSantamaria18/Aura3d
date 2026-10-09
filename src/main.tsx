import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Fade out and remove initial splash screen after first render
requestAnimationFrame(() => {
  const splash = document.getElementById('initial-splash');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => {
      splash.remove();
    }, 500);
  }
});

// Register Offline Service Worker with automatic updates in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage('SKIP_WAITING');
        }
      })
      .catch((err) => {
        console.debug('ServiceWorker registration skipped:', err);
      });
  });

  // Only reload if the page was already controlled by a prior service worker (update flow).
  // On first install, hadController is false, so we do not unexpectedly reload during user interactions.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing && hadController) {
      refreshing = true;
      window.location.reload();
    }
  });
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
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

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

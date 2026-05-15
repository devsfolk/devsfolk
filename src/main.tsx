import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const CACHE_RESET_VERSION = '2026-05-15-1';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void (async () => {
      const shouldResetCaches = localStorage.getItem('omnistore-cache-reset-version') !== CACHE_RESET_VERSION;

      if (shouldResetCaches) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith('omnistore-')).map((key) => caches.delete(key)));
        }

        localStorage.setItem('omnistore-cache-reset-version', CACHE_RESET_VERSION);
      }

      let hasReloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasReloaded) {
          return;
        }

        hasReloaded = true;
        window.location.reload();
      });

      const registration = await navigator.serviceWorker.register('/sw.js');
      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    })();
  });
}

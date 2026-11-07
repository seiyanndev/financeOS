import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { initInstallCapture } from './lib/install';
import { countVisit } from './lib/installPrompt';
import { dismissSplash } from './lib/splash';

initInstallCapture();
countVisit();

// Ask the browser not to evict IndexedDB under storage pressure: this is the only copy of the data.
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Fade the launch splash (index.html) once the first frame of the app has painted.
requestAnimationFrame(() => requestAnimationFrame(dismissSplash));

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Open Sauce One, self-hosted. Fontshare served the old face from a third
// domain the page had to reach before it could set a word; these ship with
// the bundle, so the first paint is already in the right typeface.
import '@fontsource/open-sauce-one/latin-400.css';
import '@fontsource/open-sauce-one/latin-500.css';
import '@fontsource/open-sauce-one/latin-600.css';
import '@fontsource/open-sauce-one/latin-700.css';
import '@fontsource/open-sauce-one/latin-800.css';
import '@fontsource/open-sauce-one/latin-900.css';
import './studio.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

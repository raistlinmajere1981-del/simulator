import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppNext } from './AppNext';
import { I18nProvider } from './I18nProvider';
import { UI_LOCALE_STORAGE_KEY, resolveInitialAppLocale, translate } from './i18n';
import './styles.css';
import './simulation.css';
import './dialogs.css';
import './portable.css';
import './geodesy.css';
import './terrain.css';
import './multi-terrain.css';
import './water-surface-control.css';
import './world-model-viewport.css';
import './atmosphere-profile-control.css';

const storedLocale = (() => {
  try {
    return window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
})();
const preferredLanguages = navigator.languages.length > 0
  ? navigator.languages
  : [navigator.language];
const initialLocale = resolveInitialAppLocale(storedLocale, preferredLanguages);
document.documentElement.lang = initialLocale;
document.title = translate(initialLocale, 'app.title');

const root = document.getElementById('root');

if (!root) {
  throw new Error(translate(initialLocale, 'error.rootMissing'));
}

createRoot(root).render(
  <StrictMode>
    <I18nProvider initialLocale={initialLocale}>
      <AppNext />
    </I18nProvider>
  </StrictMode>
);

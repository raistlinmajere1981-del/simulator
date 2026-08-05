import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppNext } from './AppNext';
import './styles.css';
import './simulation.css';
import './dialogs.css';
import './portable.css';
import './geodesy.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Uygulama kök elemanı bulunamadı.');
}

createRoot(root).render(
  <StrictMode>
    <AppNext />
  </StrictMode>
);

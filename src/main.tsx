import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './index.css';

// Disable right-click context menu in production to preserve immersive gaming experience
if (import.meta.env.PROD) {
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, { capture: true });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

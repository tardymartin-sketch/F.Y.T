import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import './index.css';

// Charger le listener de l'extension Dev Inspector en mode développement
if (import.meta.env.DEV) {
  import('./inspector-listener');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

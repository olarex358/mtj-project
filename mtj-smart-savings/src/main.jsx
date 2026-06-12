import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startSyncListener } from './lib/sync';
import './styles/global.css';

startSyncListener();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

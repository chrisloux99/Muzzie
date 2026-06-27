import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { BlockchainProvider } from './context/BlockchainContext';
import { ResponsiveProvider } from './context/ResponsiveContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BlockchainProvider>
        <ResponsiveProvider>
          <App />
        </ResponsiveProvider>
      </BlockchainProvider>
    </AuthProvider>
  </React.StrictMode>
);
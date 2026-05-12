import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { SocketProvider } from './context/SocketContext';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <SocketProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                className: '!bg-surface !text-fg !border !border-border',
                duration: 3000,
                ariaProps: { role: 'status', 'aria-live': 'polite' },
                success: {
                  ariaProps: { role: 'status', 'aria-live': 'polite' },
                },
                error: {
                  ariaProps: { role: 'alert', 'aria-live': 'assertive' },
                },
              }}
            />
          </SocketProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

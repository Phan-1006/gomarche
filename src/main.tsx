import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Error Boundary to prevent blank screen
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ maxWidth: '480px', width: '100%', background: '#FFFFFF', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #E5E7EB', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', fontSize: '1.5rem', fontWeight: 900 }}>!</div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 900, color: '#111827', margin: '0 0 0.5rem 0' }}>Gomarché Goma</h2>
            <p style={{ fontSize: '0.875rem', color: '#4B5563', margin: '0 0 1.5rem 0' }}>Une mise à jour a été appliquée. Cliquez ci-dessous pour recharger l'application.</p>
            <button
              onClick={() => {
                localStorage.removeItem('gm_custom_firebase_config');
                window.location.reload();
              }}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#E2001A', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Recharger Gomarché
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Register Service Worker for PWA compliance (safe for Vite)
if ('serviceWorker' in navigator && typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration failed:', err);
    });
  });
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

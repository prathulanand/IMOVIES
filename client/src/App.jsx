import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CityProvider } from './context/CityContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ui/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CityProvider>
          <div className="d-flex flex-column min-vh-100" style={{ background: 'var(--bg-main)' }}>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0e0b16',
                  color: '#fff',
                  border: '1px solid #281d3d',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 12px rgba(168, 85, 247, 0.25)',
                },
                success: {
                  iconTheme: {
                    primary: '#a855f7',
                    secondary: '#0e0b16',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#121624',
                  },
                },
              }}
            />
            <Navbar />
            <main className="flex-grow-1">
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </CityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

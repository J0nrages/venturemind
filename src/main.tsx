import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          // Theme-aware styles using CSS variables from shadcn/ui
          className: 'z-[10000] pointer-events-auto',
          style: {
            // Lift the toaster above floating input cards
            zIndex: 10000,
            // Respect theme tokens
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
            padding: '12px 16px',
            minWidth: '280px',
          },
          success: {
            className: 'bg-[hsl(var(--success,141_78%_36%)/0.1)] text-[hsl(var(--success-foreground,141_78%_16%))] border-[hsl(var(--success,141_78%_36%)/0.3)]',
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            className: 'bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive-foreground))] border-[hsl(var(--destructive)/0.25)]',
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
        containerClassName="!mt-24 sm:!mt-20"
      />
    </ErrorBoundary>
  </StrictMode>
);
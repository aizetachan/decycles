import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { UIProvider } from './contexts/UIContext.tsx';
import { CategoriesProvider } from './contexts/CategoriesContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';

// Data router (not BrowserRouter) is required for `useBlocker` in v7.
// App keeps its own internal <Routes> tree under this catch-all.
const router = createBrowserRouter([
  { path: '*', element: <App /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <UIProvider>
          <CategoriesProvider>
            <RouterProvider router={router} />
          </CategoriesProvider>
        </UIProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
);

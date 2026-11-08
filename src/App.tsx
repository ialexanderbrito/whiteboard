import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TooltipProvider } from './components/ui/tooltip';

import { LoadingScreen } from './components/layout/LoadingScreen';

// Divisão de código sob demanda (Lazy Loading) para carregamento inicial ultra-rápido
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const BoardPage = lazy(() => import('./pages/BoardPage').then(m => ({ default: m.BoardPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const PageLoader = () => <LoadingScreen />;

// Redireciona URLs legadas /board/:boardId para o padrão limpo e curto /b/:id (sem prefixo board_)
const LegacyBoardRedirect: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const cleanId = (boardId || '').replace(/^board_/, '');
  return <Navigate to={`/b/${cleanId}`} replace />;
};

// Componente para proteger a rota do Dashboard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mirio_theme">
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/board/:boardId" element={<LegacyBoardRedirect />} />
                <Route path="/b/:boardId" element={<BoardPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;

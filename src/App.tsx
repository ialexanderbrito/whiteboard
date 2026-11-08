import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
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

// Rota raiz ("/"): exibe o Dashboard para usuários logados ou a tela de login diretamente na raiz se não autenticado
const RootRoute: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return <DashboardPage />;
};

// Redireciona acessos à rota legada /login diretamente para a raiz "/", preservando parâmetros como ?redirect=
const LegacyLoginRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  return <Navigate to={redirect ? `/?redirect=${encodeURIComponent(redirect)}` : '/'} replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mirio_theme">
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/login" element={<LegacyLoginRedirect />} />
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

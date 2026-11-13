import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TooltipProvider } from './components/ui/tooltip';

import { LoadingScreen } from './components/layout/LoadingScreen';
import { DashboardPage } from './pages/DashboardPage';

// Divisão de código sob demanda (Lazy Loading) para carregamento inicial ultra-rápido
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const InvitePage = lazy(() => import('./pages/InvitePage').then(m => ({ default: m.InvitePage })));
const BoardPage = lazy(() => import('./pages/BoardPage').then(m => ({ default: m.BoardPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));

const PageLoader = () => <LoadingScreen />;

// Redireciona URLs legadas /board/:boardId para o padrão limpo e curto /b/:id (sem prefixo board_)
const LegacyBoardRedirect: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const cleanId = (boardId || '').replace(/^board_/, '');
  return <Navigate to={`/b/${cleanId}`} replace />;
};

// Rota raiz ("/"): exibe o Dashboard com Skeleton adaptativo imediatamente sem travar no LoadingScreen global
const RootRoute: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || (typeof window !== 'undefined' ? sessionStorage.getItem('mirio_auth_redirect') : null);

  // Se a autenticação estiver carregando, renderiza o DashboardPage imediatamente
  // para que o Skeleton Screen Adaptativo apareça na tela sem o LoadingScreen global de tela cheia
  if (loading) {
    return <DashboardPage />;
  }

  if (currentUser) {
    if (redirect && redirect !== '/') {
      sessionStorage.removeItem('mirio_auth_redirect');
      return <Navigate to={redirect} replace />;
    }
    return <DashboardPage />;
  }

  return <LoginPage />;
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
                <Route path="/invite/:boardId" element={<InvitePage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
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

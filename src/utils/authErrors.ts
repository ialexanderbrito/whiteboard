/**
 * Utilitários para tratamento resiliente de erros do Firebase Auth e detecção de ambientes
 * onde popups são sistematicamente bloqueados por navegadores ou webviews internas.
 */

export const isMobileOrInAppBrowser = (
  customUserAgent?: string,
  customTouchPoints?: number
): boolean => {
  const ua = customUserAgent !== undefined 
    ? customUserAgent 
    : (typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : '');
  
  const touchPoints = customTouchPoints !== undefined
    ? customTouchPoints
    : (typeof window !== 'undefined' && window.navigator ? (window.navigator.maxTouchPoints || 0) : 0);

  if (!ua) return false;

  // Webviews e navegadores internos de aplicativos sociais (onde window.open/popup é 100% bloqueado)
  const isInApp = /FBAN|FBAV|FB_IAB|Instagram|Twitter|LinkedInApp|musical_ly|TikTok|WhatsApp|Snapchat|Line\/|Slack|Pinterest|; wv\)/i.test(ua);

  // Dispositivos móveis comuns (iOS Safari, Android Chrome/Firefox, etc)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // iPad no iPadOS 13+ finge ser Mac Safari com tela sensível ao toque
  const isIPadOS = /Macintosh/i.test(ua) && touchPoints > 2;

  return isInApp || isMobile || isIPadOS;
};

/**
 * Converte códigos de erro do Firebase Auth em mensagens amigáveis em português.
 * Códigos correspondentes a cancelamento voluntário do usuário retornam string vazia
 * para não exibir alertas de erro desnecessários.
 */
export const formatAuthError = (err: unknown): string => {
  if (!err) return '';
  const error = err as { code?: string; message?: string };
  const code = error.code || '';

  switch (code) {
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up. Redirecionando para o login seguro do Google...';
    
    // Ações voluntárias ou sobreposições não devem exibir mensagem de erro agressiva
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';

    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique sua internet e tente novamente.';

    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta cadastrada com este e-mail através de outro método de login.';

    case 'auth/user-disabled':
      return 'Esta conta de usuário foi temporariamente desativada.';

    case 'auth/operation-not-allowed':
      return 'O provedor de login com Google não está ativado no Firebase Console.';

    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no console do Firebase para autenticação.';

    case 'auth/invalid-credential':
    case 'auth/user-token-expired':
      return 'Sua sessão ou credencial expirou. Por favor, tente autenticar novamente.';

    default: {
      const rawMessage = error.message || '';
      // Remove o prefixo técnico feio "Firebase: Error (auth/xyz)." se existir
      if (rawMessage.startsWith('Firebase:')) {
        return 'Não foi possível concluir o login com o Google. Tente novamente ou acesse como Convidado.';
      }
      return rawMessage || 'Falha ao autenticar com Google. Tente novamente ou entre como Convidado.';
    }
  }
};

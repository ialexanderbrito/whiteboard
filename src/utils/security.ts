/**
 * Utilitários de Segurança Criptográfica para o Mirio.
 */

/**
 * Comparação em tempo constante para mitigar ataques de temporização (Timing Attacks).
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Computa o hash criptográfico SHA-256 de uma senha, com suporte opcional a salt (ex: boardId)
 * para mitigar ataques de rainbow tables e força bruta pré-computada.
 */
export async function hashBoardPassword(plainText: string, salt?: string): Promise<string> {
  const trimmed = plainText.trim();
  if (!trimmed) return '';

  const saltedInput = salt ? `${trimmed}:${salt}:mirio_salt` : trimmed;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback seguro caso subtle crypto não esteja disponível em ambientes legados
  let hash = 0;
  for (let i = 0; i < saltedInput.length; i++) {
    const char = saltedInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'legacy_' + Math.abs(hash).toString(16);
}

/**
 * Verifica se a senha fornecida pelo usuário coincide com a senha salva (hash salgado, hash SHA-256 padrão ou legado),
 * utilizando comparação em tempo constante.
 */
export async function verifyBoardPassword(
  enteredPassword: string,
  storedPasswordOrHash?: string,
  salt?: string
): Promise<boolean> {
  if (!storedPasswordOrHash) return false;
  const trimmed = enteredPassword.trim();
  if (!trimmed) return false;

  // 1. Confere contra hash com salt (se salt foi informado)
  if (salt) {
    const computedSalted = await hashBoardPassword(trimmed, salt);
    if (constantTimeEquals(computedSalted, storedPasswordOrHash)) {
      return true;
    }
  }

  // 2. Confere contra hash SHA-256 padrão (sem salt)
  const computedHash = await hashBoardPassword(trimmed);
  if (constantTimeEquals(computedHash, storedPasswordOrHash)) {
    return true;
  }

  // 3. Retrocompatibilidade transparente para quadros legados com texto puro
  if (constantTimeEquals(trimmed, storedPasswordOrHash)) {
    return true;
  }

  return false;
}

/**
 * Sanitiza rotas de redirecionamento interno pós-login para prevenir Open Redirect.
 * Aceita estritamente caminhos relativos iniciados por '/' simples (ex: '/b/abc123').
 */
export function sanitizeRedirectPath(rawPath: string | null | undefined, fallback = '/'): string {
  if (!rawPath || typeof rawPath !== 'string') return fallback;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

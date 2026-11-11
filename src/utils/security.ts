/**
 * Utilitários de Segurança Criptográfica para o Mirio.
 */

/**
 * Computa o hash criptográfico SHA-256 de uma senha.
 * Previne armazenamento e transmissão de senhas em texto puro no Firestore.
 */
export async function hashBoardPassword(plainText: string): Promise<string> {
  const trimmed = plainText.trim();
  if (!trimmed) return '';

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback caso subtle crypto não esteja disponível em ambientes legados
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'legacy_' + Math.abs(hash).toString(16);
}

/**
 * Verifica se a senha fornecida pelo usuário coincide com a senha salva (hash SHA-256 ou legado).
 */
export async function verifyBoardPassword(
  enteredPassword: string,
  storedPasswordOrHash?: string
): Promise<boolean> {
  if (!storedPasswordOrHash) return false;
  const trimmed = enteredPassword.trim();
  if (!trimmed) return false;

  // 1. Confere contra hash SHA-256
  const computedHash = await hashBoardPassword(trimmed);
  if (computedHash === storedPasswordOrHash) {
    return true;
  }

  // 2. Retrocompatibilidade transparente para quadros legados com texto puro
  if (trimmed === storedPasswordOrHash) {
    return true;
  }

  return false;
}

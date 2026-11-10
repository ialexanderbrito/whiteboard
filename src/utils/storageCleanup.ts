/**
 * Utilitário de limpeza de dados locais obsoletos e redundantes no navegador.
 * Remove chaves pesadas (ex: histórico de imagens em Base64 e dumps de quadros já no IndexedDB)
 * garantindo que o localStorage permaneça sempre livre e longe do limite de 5MB.
 */

export const OBSOLETE_STORAGE_KEYS = [
  'mirio_recent_uploaded_images',
] as const;

export function cleanupObsoleteStorage(): void {
  if (typeof localStorage === 'undefined') return;

  try {
    // 1. Remove histórico pesado de imagens em Base64
    for (const key of OBSOLETE_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    // 2. Remove chaves órfãs antigas de timer, votação e prefixos legados
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Mantém apenas mirio_timer_compact e mirio_timer_volume (preferências do usuário)
      if (
        key.startsWith('mirio_timer_') &&
        key !== 'mirio_timer_compact' &&
        key !== 'mirio_timer_volume'
      ) {
        keysToRemove.push(key);
      } else if (key.startsWith('mirio_votes_')) {
        keysToRemove.push(key);
      } else if (key.startsWith('mirio_board_elements_board_')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
  } catch {
    // Ignora restrições do navegador em modo anônimo estrito
  }
}

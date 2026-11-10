import type { RichTextFormatState } from '../utils/richText';

export interface TextSelectionInfo {
  text: string;
}

/**
 * Ponte entre a barra de propriedades (SelectionContextBar) e o editor rico ativo.
 * A barra precisa aplicar formatação na seleção do contentEditable, não no elemento
 * inteiro — exatamente como no Miro.
 */
export interface ActiveTextEditor {
  elementId: string;
  getSelectionInfo(): TextSelectionInfo | null;
  getActiveFormats(): RichTextFormatState;
  applyCommand(command: 'bold' | 'italic' | 'underline' | 'strikeThrough'): void;
  applyColor(color?: string): void;
  applyLink(url: string, label?: string): void;
  removeLink(): void;
  /** Indica se o cursor/seleção atual está dentro de um link. */
  hasActiveLink(): boolean;
  focus(): void;
  /** Conclui e persiste a edição ativa de forma idempotente. */
  finish(): void;
}

let activeEditor: ActiveTextEditor | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Um listener com problema não pode derrubar a edição.
    }
  });
}

export const textEditingBridge = {
  register(editor: ActiveTextEditor) {
    activeEditor = editor;
    emit();
  },

  unregister(elementId: string) {
    if (activeEditor?.elementId === elementId) {
      activeEditor = null;
      emit();
    }
  },

  get(elementId?: string): ActiveTextEditor | null {
    if (!activeEditor) return null;
    if (elementId && activeEditor.elementId !== elementId) return null;
    return activeEditor;
  },

  isEditing(elementId: string): boolean {
    return activeEditor?.elementId === elementId;
  },

  notify() {
    emit();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

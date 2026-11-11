import type { ChecklistItem } from '../types/element';

/**
 * Gera itens padrão de exemplo para um novo Micro-Widget de Checklist
 */
export function createDefaultChecklistItems(): ChecklistItem[] {
  return [
    {
      id: 'chk_' + Math.random().toString(36).substring(2, 9),
      text: 'Definir escopo da tarefa',
      completed: false,
    },
    {
      id: 'chk_' + Math.random().toString(36).substring(2, 9),
      text: 'Criar protótipo no Mirio',
      completed: false,
    },
    {
      id: 'chk_' + Math.random().toString(36).substring(2, 9),
      text: 'Validar com o time',
      completed: false,
    },
  ];
}

/**
 * Converte o texto de um Post-it em um Checklist estruturado com divisão inteligente de linhas
 * e remoção de marcadores automáticos (bullets, números, [x], etc).
 */
export function convertStickyToChecklist(text?: string): { title: string; items: ChecklistItem[] } {
  if (!text || !text.trim()) {
    return {
      title: 'Lista de Tarefas',
      items: createDefaultChecklistItems(),
    };
  }

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return {
      title: 'Lista de Tarefas',
      items: createDefaultChecklistItems(),
    };
  }

  let title = 'Lista de Tarefas';
  let linesToProcess = rawLines;

  // Se a primeira linha tiver formatação de título (ex: "# Título" ou "**Título**")
  const firstLine = rawLines[0];
  const titleMatch = firstLine.match(/^(?:#+\s*|\*\*)([^*#]+)(?:\*\*)?$/);
  if (titleMatch && rawLines.length > 1) {
    title = titleMatch[1].trim();
    linesToProcess = rawLines.slice(1);
  }

  const items: ChecklistItem[] = [];

  for (const line of linesToProcess) {
    // Remove marcadores iniciais de lista (- , * , 1. , etc.)
    let processed = line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    // Detecta se é uma tarefa marcada com [x] ou [X]
    const isCompleted = /^\[[xX]\]/.test(processed);
    // Remove o indicador de checkbox e eventuais bullets repetidos
    const cleanedText = processed
      .replace(/^\[[ xX]?\]\s*/, '')
      .replace(/^[-*•]\s*/, '')
      .trim();

    if (cleanedText) {
      items.push({
        id: 'chk_' + Math.random().toString(36).substring(2, 9),
        text: cleanedText,
        completed: isCompleted,
      });
    }
  }

  return {
    title,
    items: items.length > 0 ? items : createDefaultChecklistItems(),
  };
}

/**
 * Converte itens de um Checklist de volta para o texto de um Post-it convencional
 */
export function convertChecklistToSticky(items?: ChecklistItem[], title?: string): string {
  const lines: string[] = [];
  if (title && title.trim() && title.trim() !== 'Lista de Tarefas' && title.trim() !== 'Checklist') {
    lines.push(`**${title.trim()}**\n`);
  }

  if (!items || items.length === 0) {
    lines.push('[ ] Nova tarefa');
  } else {
    items.forEach((item) => {
      lines.push(`${item.completed ? '[x]' : '[ ]'} ${item.text}`);
    });
  }

  return lines.join('\n');
}

/**
 * Calcula o progresso quantitativo e percentual de um Checklist
 */
export function computeChecklistProgress(items?: ChecklistItem[]): {
  total: number;
  completed: number;
  percentage: number;
} {
  if (!items || items.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const percentage = Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

/**
 * Calcula a altura recomendada do card com base na quantidade de itens
 */
export function computeChecklistHeight(itemCount: number): number {
  const headerHeight = 60;
  const itemHeight = 36;
  const footerHeight = 44;
  const padding = 20;
  const calculated = headerHeight + itemCount * itemHeight + footerHeight + padding;
  return Math.max(180, calculated);
}

import type { CanvasElement } from '../types/element';

export interface SprintColumnConfig {
  title: string;
  frameFill: string;
  frameStroke: string;
  stickyFill: string;
  cards: string[];
}

export interface SprintTemplate {
  id: string;
  title: string;
  description: string;
  badge: string;
  iconName: string;
  columns: SprintColumnConfig[];
}

export const SPRINT_TEMPLATES: SprintTemplate[] = [
  {
    id: 'kanban_sprint',
    title: 'Kanban de Sprint Completo',
    description: 'Fluxo completo de entrega com 4 raias e 10 a 12 post-its em grade por raia: A Fazer, Em Andamento, Revisão/QA e Concluído.',
    badge: '4 Raias • 44 Cards',
    iconName: 'LayoutGrid',
    columns: [
      {
        title: '📋 A Fazer (Backlog)',
        frameFill: 'rgba(241, 245, 249, 0.45)',
        frameStroke: '#64748b',
        stickyFill: '#fff9b1',
        cards: [
          'Autenticação via SSO Google e GitHub',
          'Refatorar queries críticas do banco de dados',
          'Criar componente de upload em lote',
          'Configurar rate limiting na API pública',
          'Ajustar contraste WCAG 2.2 em botões primários',
          'Adicionar telemetria e rastreamento de erros',
          'Documentar endpoints da v2 no Swagger',
          'Validar fluxo de checkout internacional',
          'Implementar cache distribuído para listagens',
          'Criar tela de onboarding para novos membros',
          'Atualizar termos de privacidade e cookies',
        ],
      },
      {
        title: '⚡ Em Andamento (WIP)',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#3b82f6',
        stickyFill: '#bae6fd',
        cards: [
          'Sincronização em tempo real via WebSocket',
          'Otimização de carregamento de imagens com WebP',
          'Ajustes de layout responsivo no mobile',
          'Integração com webhooks de pagamento Stripe',
          'Validação tipada de formulários com Zod',
          'Refatoração da arquitetura de estados',
          'Configuração do pipeline de CI/CD no GitHub',
          'Padronização de componentes no design system',
          'Tratamento de reconexão de rede offline',
          'Debounce inteligente na busca global',
          'Indexação otimizada no banco de dados',
        ],
      },
      {
        title: '🔍 Em Revisão & QA',
        frameFill: 'rgba(253, 244, 255, 0.45)',
        frameStroke: '#a855f7',
        stickyFill: '#f5d0fe',
        cards: [
          'Code Review: PR #142 - Controle RBAC',
          'Testes de carga de estresse com 1.000 req/s',
          'Validação de compatibilidade Safari e Firefox',
          'Auditoria de vulnerabilidades de dependências',
          'Verificação de memory leak em listeners',
          'Revisão de microcopy com equipe de Produto',
          'Suíte de testes end-to-end com Playwright',
          'Testes de acessibilidade com leitor de tela',
          'Verificação de rollback automático no cluster',
          'Aprovação final do Design Lead',
          'Revisão de logs de segurança e auditoria',
        ],
      },
      {
        title: '✅ Concluído (Done)',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: [
          '🚀 Deploy v1.4.0 com zero downtime',
          '⚡ Redução de 45% no bundle inicial',
          '🔒 Correção de vulnerabilidade CSRF',
          '📊 Dashboard analítico com métricas em tempo real',
          '🎨 Tema escuro calibrado com alto contraste',
          '📱 Suporte a gestos touch e pinch-to-zoom',
          '🔔 Central de notificações em tempo real',
          '🌐 Internacionalização multi-idioma PT/EN',
          '⏱️ Latência média da API abaixo de 60ms',
          '🎉 Retrospectiva concluída com 100% da meta',
          '📦 Publicação da biblioteca interna de componentes',
        ],
      },
    ],
  },
  {
    id: 'retro_geral',
    title: 'Retrospectiva Ágil',
    description: 'Cerimônia completa de retrospectiva com 3 raias: o que funcionou bem, o que podemos melhorar e plano de ações com responsáveis.',
    badge: '3 Raias • 33 Cards',
    iconName: 'Sparkles',
    columns: [
      {
        title: '🌟 O que funcionou bem',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: [
          'Comunicação assíncrona diária muito clara',
          'Deploy contínuo funcionou sem incidentes',
          'Pair programming acelerou tarefas complexas',
          'Critérios de aceite estavam bem detalhados',
          'Tempo de code review caiu para menos de 4h',
          'Boa colaboração entre Design e Engenharia',
          'Nenhum bug crítico vazou para produção',
          'Meta da sprint atingida antes da sexta-feira',
          'Excelente cobertura de testes automatizados',
          'Transparência com stakeholders no Sprint Review',
          'Ambiente de staging 100% fiel a produção',
        ],
      },
      {
        title: '💡 O que podemos melhorar',
        frameFill: 'rgba(255, 251, 235, 0.45)',
        frameStroke: '#f59e0b',
        stickyFill: '#fed7aa',
        cards: [
          'Diminuir interrupções fora da Daily',
          'Definir melhor as dependências entre times',
          'Estimar melhor tarefas de refatoração técnica',
          'Evitar adicionar cards novos no meio da Sprint',
          'Documentar decisões de arquitetura em ADRs',
          'Melhorar o detalhamento de testes manuais de QA',
          'Reduzir reuniões que poderiam ser mensagens',
          'Acompanhar burndown chart no meio da semana',
          'Alinhar expectativas de prazos mais cedo',
          'Garantir tempo para débito técnico na sprint',
          'Organizar melhor as tags do backlog',
        ],
      },
      {
        title: '🎯 Plano de Ações & Prazos',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#2563eb',
        stickyFill: '#bae6fd',
        cards: [
          'Criar template de ADR para decisões de arquitetura',
          'Configurar alertas automáticos de PR pendente',
          'Reservar 15% da capacidade para Débito Técnico',
          'Fazer alinhamento semanal com equipe de DevOps',
          'Atualizar checklist de Definition of Done (DoD)',
          'Implementar smoke tests após cada deploy',
          'Agendar workshop de otimização de consultas SQL',
          'Organizar sessão de refatoração em mob programming',
          'Definir responsável de plantão rotativo por sprint',
          'Publicar resumo das decisões no Slack do time',
          'Criar dashboard de métricas DORA da equipe',
        ],
      },
    ],
  },
  {
    id: 'retro_foco',
    title: 'Acertos, Erros e Aprendizados',
    description: 'Formato direto e focado: o que deu certo, o que deu errado e o que a equipe aprendeu para a próxima iteração.',
    badge: '3 Raias • 33 Cards',
    iconName: 'Target',
    columns: [
      {
        title: '👍 O que deu certo na Sprint',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: [
          'Entregas pontuais dos três maiores objetivos',
          'Testes de carga rodaram sem falhas',
          'Zero downtime nas migrações de banco',
          'Engajamento alto da equipe em code reviews',
          'Feedback positivo dos usuários no beta',
          'Ambiente de homologação estável',
          'Uso eficiente de branch previews',
          'Métricas de performance dentro do SLA',
          'Boa distribuição de tarefas no time',
          'Documentação de API atualizada a tempo',
          'Integrações com parceiros validadas com sucesso',
        ],
      },
      {
        title: '👎 O que deu errado na Sprint',
        frameFill: 'rgba(254, 242, 242, 0.45)',
        frameStroke: '#ef4444',
        stickyFill: '#fecdd3',
        cards: [
          'Bloqueio inesperado por serviço de terceiros',
          'Escopo de uma issue cresceu sem aviso',
          'Falha transitória em testes flaky no CI',
          'Demora para aprovar credenciais de produção',
          'Subestimação do esforço em migração de dados',
          'Falta de alinhamento com equipe de segurança',
          'Gargalo de revisão no último dia da sprint',
          'Build demorando mais de 15 minutos',
          'Conflitos recorrentes de merge em branch longa',
          'Instabilidade temporária no cluster de testes',
          'Falta de dados realistas em ambiente local',
        ],
      },
      {
        title: '🚀 Aprendizados da Equipe',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#8b5cf6',
        stickyFill: '#ddd6fe',
        cards: [
          'Validar dependências externas antes de iniciar',
          'Dividir histórias grandes em entregas menores',
          'Isolar testes flaky imediatamente para não travar CI',
          'Fazer merge diário para evitar branch drift',
          'Automatizar geração de dados mock para testes locais',
          'Envolver segurança desde a fase de refinamento',
          'Monitorar métricas de build para otimizar cache',
          'Manter WIP baixo para focar em finalizar itens',
          'Documentar bugs conhecidos no backlog',
          'Comemorar vitórias e aprendizados com o time',
          'Revisar periodicamente o fluxo de valor da equipe',
        ],
      },
    ],
  },
  {
    id: 'matriz_eisenhower',
    title: 'Matriz Eisenhower de Priorização',
    description: 'Classifique demandas e tarefas em 4 quadrantes clássicos: Fazer Agora, Agendar, Delegar e Eliminar.',
    badge: '4 Quadrantes • Priorização',
    iconName: 'CheckSquare',
    columns: [
      {
        title: '🔥 Urgente & Importante (Fazer Já)',
        frameFill: 'rgba(254, 242, 242, 0.45)',
        frameStroke: '#ef4444',
        stickyFill: '#fecdd3',
        cards: [
          'Resolver incidente crítico de indisponibilidade',
          'Corrigir vulnerabilidade de segurança no login',
          'Atender cliente enterprise em risco de churn',
          'Bloqueio no processamento de pagamentos Stripe',
          'Prazo regulatório de conformidade fiscal hoje',
        ],
      },
      {
        title: '🎯 Não Urgente & Importante (Agendar/Planejar)',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#3b82f6',
        stickyFill: '#bae6fd',
        cards: [
          'Definir roadmap do próximo trimestre',
          'Refatorar arquitetura monolítica para serviços',
          'Treinamento e capacitação contínua da equipe',
          'Implementar testes automatizados end-to-end',
          'Pesquisas de usabilidade com clientes ativos',
        ],
      },
      {
        title: '⚡ Urgente & Não Importante (Delegar)',
        frameFill: 'rgba(254, 249, 195, 0.45)',
        frameStroke: '#eab308',
        stickyFill: '#fef08a',
        cards: [
          'Responder formulários rotineiros de auditoria',
          'Agendamento de reuniões operacionais semanais',
          'Triagem inicial de tickets de suporte nível 1',
          'Atualizar planilhas de inventário de hardware',
          'Envio manual de relatórios operacionais',
        ],
      },
      {
        title: '🗑️ Não Urgente & Não Importante (Eliminar)',
        frameFill: 'rgba(241, 245, 249, 0.45)',
        frameStroke: '#94a3b8',
        stickyFill: '#e2e8f0',
        cards: [
          'Reuniões de alinhamento sem pauta definida',
          'Relatórios manuais que ninguém consulta',
          'Refatorações cosméticas sem benefício real',
          'Discussões intermináveis em chats sem decisão',
        ],
      },
    ],
  },
  {
    id: 'lean_canvas',
    title: 'Lean Canvas de Modelo de Negócio',
    description: 'Valide a viabilidade da sua ideia ou produto com os blocos fundamentais de proposta de valor e mercado.',
    badge: '5 Raias • Visão de Negócio',
    iconName: 'Briefcase',
    columns: [
      {
        title: '⚠️ Problema & Alternativas Existentes',
        frameFill: 'rgba(254, 242, 242, 0.45)',
        frameStroke: '#f43f5e',
        stickyFill: '#fecdd3',
        cards: [
          'Ferramentas atuais são lentas e burocráticas',
          'Falta de sincronia em tempo real para times remotos',
          'Preço por usuário inviável para startups pequenas',
          'Alternativas hoje: planilhas manuais e Miro caro',
        ],
      },
      {
        title: '💡 Proposta Única de Valor (UVP)',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#8b5cf6',
        stickyFill: '#ddd6fe',
        cards: [
          'Whiteboard ultra-rápido com experiência nativa',
          'Colaboração ao vivo sem atrito e sem limites',
          'Templates e votações integradas para squads ágeis',
          'Design minimalista que não sobrecarrega a tela',
        ],
      },
      {
        title: '🚀 Solução & Recursos Principais',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: [
          'Canvas infinito com zoom fluido a 60fps',
          'Sessões de votação democrática em tempo real',
          'Timer sincronizado para dinâmicas de sprint',
          'Compartilhamento com links curtos e senha',
        ],
      },
      {
        title: '📊 Métricas-Chave & Indicadores',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#0284c7',
        stickyFill: '#bae6fd',
        cards: [
          'DAU/MAU (usuários ativos diários/mensais)',
          'Taxa de retenção após a 1ª semana (>40%)',
          'Tempo até a primeira colaboração em equipe',
          'Net Promoter Score (NPS) acima de 75',
        ],
      },
      {
        title: '📣 Canais & Vantagem Competitiva',
        frameFill: 'rgba(254, 243, 199, 0.45)',
        frameStroke: '#f59e0b',
        stickyFill: '#fde68a',
        cards: [
          'Crescimento viral via quadros compartilhados',
          'Comunidade aberta de desenvolvedores e designers',
          'Integrações com Slack, GitHub e Google Workspace',
          'Desempenho instantâneo como principal diferencial',
        ],
      },
    ],
  },
  {
    id: 'retro_4ls',
    title: 'Retrospectiva 4Ls (Liked, Learned, Lacked, Longed)',
    description: 'Dinâmica ágil para avaliar a sprint em 4 prismas: O que gostamos, aprendemos, faltou e desejamos.',
    badge: '4 Raias • Dinâmica Ágil',
    iconName: 'Heart',
    columns: [
      {
        title: '❤️ Liked (O que adoramos)',
        frameFill: 'rgba(254, 242, 242, 0.45)',
        frameStroke: '#e11d48',
        stickyFill: '#fecdd3',
        cards: [
          'Comunicação assíncrona foi exemplar',
          'Deploy de sexta-feira ocorreu 100% liso',
          'Pair programming destravou o módulo complexo',
          'Excelente suporte mútuo entre squads',
        ],
      },
      {
        title: '🧠 Learned (O que aprendemos)',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#059669',
        stickyFill: '#a7f3d0',
        cards: [
          'Indexar tabelas com antecedência salvou o banco',
          'Métricas do Grafana alertaram anomalia a tempo',
          'Prototipar antes de codar economizou 3 dias',
          'Mantenha as branches curtas com merge diário',
        ],
      },
      {
        title: '⚠️ Lacked (O que sentimos falta)',
        frameFill: 'rgba(254, 249, 195, 0.45)',
        frameStroke: '#ca8a04',
        stickyFill: '#fef08a',
        cards: [
          'Critérios de aceite mais detalhados nos cards',
          'Ambiente de homologação com dados mais recentes',
          'Mais tempo para documentar as novas rotas de API',
          'Testes de carga antes de liberar para o beta',
        ],
      },
      {
        title: '✨ Longed For (O que desejamos)',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#2563eb',
        stickyFill: '#bfdbfe',
        cards: [
          'Pipeline automatizado de testes de ponta a ponta',
          'Reuniões de refinamento mais objetivas e focadas',
          'Mais momentos de comemoração após lançamentos',
          'Mais dias de foco sem reuniões no meio da tarde',
        ],
      },
    ],
  },
  {
    id: 'daily_standup',
    title: 'Daily Standup da Equipe',
    description: 'Check-in diário com 3 raias clássicas do Scrum para alinhar entregas e remover bloqueios com rapidez.',
    badge: '3 Raias • Rotina Diária',
    iconName: 'CalendarDays',
    columns: [
      {
        title: '✅ O que realizei ontem?',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: [
          'Finalizei o PR de refatoração do modal',
          'Resolvi o bug de autenticação mobile',
          'Validei os layouts do checkout com design',
          'Escrevi a documentação do endpoint no Swagger',
        ],
      },
      {
        title: '🎯 O que farei hoje?',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#3b82f6',
        stickyFill: '#bae6fd',
        cards: [
          'Implementar sincronização em tempo real de votos',
          'Testar modo tela cheia de apresentação',
          'Realizar code review dos PRs pendentes da fila',
          'Ajustar cobertura de testes unitários do serviço',
        ],
      },
      {
        title: '🚧 Impedimentos & Bloqueios',
        frameFill: 'rgba(254, 242, 242, 0.45)',
        frameStroke: '#ef4444',
        stickyFill: '#fecdd3',
        cards: [
          'Aguardando aprovação de credenciais do ambiente',
          'Dependência da liberação da rota no backend',
          'Instabilidade temporária no ambiente de staging',
        ],
      },
    ],
  },
  {
    id: 'user_story_map',
    title: 'User Story Mapping & Jornada',
    description: 'Mapeie a jornada completa do usuário dividida em atividades, MVP Release 1 e Expansão Release 2.',
    badge: '4 Raias • Product Discovery',
    iconName: 'Users',
    columns: [
      {
        title: '🚶 1. Descoberta & Onboarding',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#7c3aed',
        stickyFill: '#ddd6fe',
        cards: [
          'Acessar página inicial via convite ou busca',
          'Login rápido em 1 clique com Google ou GitHub',
          'Tour guiado de 3 passos pelos recursos principais',
          'Criação do primeiro quadro com template pronto',
        ],
      },
      {
        title: '🎨 2. Criação & Colaboração (MVP R1)',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#059669',
        stickyFill: '#a7f3d0',
        cards: [
          'Adicionar post-its coloridos e formatar texto',
          'Desenhar livremente com caneta e marca-texto',
          'Mover e agrupar elementos com caixa de seleção',
          'Cursores remotos ao vivo com identificação',
        ],
      },
      {
        title: '⏱️ 3. Facilitação & Votação (R1)',
        frameFill: 'rgba(254, 243, 199, 0.45)',
        frameStroke: '#d97706',
        stickyFill: '#fde68a',
        cards: [
          'Timer compartilhado na tela para todos do time',
          'Votação democrática nos melhores cartões',
          'Placar e pódio com celebração de confetes',
          'Modo apresentação em tela cheia sem menus',
        ],
      },
      {
        title: '🚀 4. Expansão & Retenção (Release 2)',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#2563eb',
        stickyFill: '#bfdbfe',
        cards: [
          'Exportação em alta resolução em PNG e PDF',
          'Integração bidirecional com Jira e Linear',
          'Histórico de versões e snapshots do quadro',
          'Controle avançado de permissões por pasta',
        ],
      },
    ],
  },
  {
    id: 'brainstorming_crazy8s',
    title: 'Brainstorming & Ideação Crazy 8s',
    description: 'Exercício dinâmico para gerar 8 soluções rápidas em poucos minutos, filtrando as hipóteses mais promissoras.',
    badge: '4 Raias • Ideação Dinâmica',
    iconName: 'Lightbulb',
    columns: [
      {
        title: '💡 Ideias Radicais & Ousadas',
        frameFill: 'rgba(254, 249, 195, 0.45)',
        frameStroke: '#ca8a04',
        stickyFill: '#fef08a',
        cards: [
          'Canvas assistido por IA que organiza notas sozinho',
          'Transcrição de voz direto em post-its em tempo real',
          'Mini-jogos rápidos de entrosamento pré-reunião',
          'Modo escuro espacial com efeitos sonoros suaves',
        ],
      },
      {
        title: '⚡ Soluções Rápidas (Quick Wins)',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#16a34a',
        stickyFill: '#bbf7d0',
        cards: [
          'Atalhos de teclado de uma tecla (V, H, N, P, T)',
          'Duplicação instantânea com Alt + Arrastar',
          'Alinhamento magnético inteligente de elementos',
          'Copiar e colar imagens direto da área de transferência',
        ],
      },
      {
        title: '🔍 Hipóteses para Validação',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#0284c7',
        stickyFill: '#bae6fd',
        cards: [
          'Times preferem votar anonimamente em retrospectivas',
          'Barra inferior é mais ergonômica em telas widescreen',
          'Timer na tela reduz em 30% a duração das reuniões',
          'Proteção por senha dispensa login obrigatório',
        ],
      },
      {
        title: '🚀 Próximos Experimentos',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#7c3aed',
        stickyFill: '#ddd6fe',
        cards: [
          'Testar protótipo com 3 clientes na próxima terça',
          'Medir engajamento da nova feature de votação',
          'Rodar teste A/B na tela de compartilhamento de link',
        ],
      },
    ],
  },
];

export function generateTemplateElements(
  template: SprintTemplate,
  origin: { x: number; y: number },
  user: { uid: string; displayName: string },
  startingZIndex: number
): Omit<CanvasElement, 'id' | 'updatedAt'>[] {
  const elements: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];

  // Dimensões calibradas para acomodar 2 colunas de post-its por raia
  const columnWidth = 460;
  const cardWidth = 200;
  const cardHeight = 120;
  const cardGapX = 16;
  const cardGapY = 16;
  const paddingX = 22;
  const paddingTop = 44;
  const gapBetweenColumns = 36;

  let currentZ = startingZIndex;

  template.columns.forEach((col, colIndex) => {
    const colX = Math.round(origin.x + colIndex * (columnWidth + gapBetweenColumns));
    const colY = Math.round(origin.y);

    const cardCount = col.cards.length;
    const rows = Math.ceil(cardCount / 2);
    const calculatedHeight = paddingTop + rows * (cardHeight + cardGapY) + 24;
    const columnHeight = Math.max(560, calculatedHeight);

    // 1. Moldura / Raia de Sprint (Frame)
    elements.push({
      type: 'frame',
      x: colX,
      y: colY,
      width: columnWidth,
      height: columnHeight,
      text: col.title,
      fill: col.frameFill,
      stroke: col.frameStroke,
      strokeWidth: 2,
      zIndex: ++currentZ,
      updatedBy: user.uid,
      updatedByName: user.displayName,
    });

    // 2. Post-its organizados em grade de 2 colunas dentro da raia
    col.cards.forEach((cardText, cardIndex) => {
      const colNum = cardIndex % 2; // 0 ou 1
      const rowNum = Math.floor(cardIndex / 2);

      const cardX = colX + paddingX + colNum * (cardWidth + cardGapX);
      const cardY = colY + paddingTop + rowNum * (cardHeight + cardGapY);

      elements.push({
        type: 'sticky',
        x: Math.round(cardX),
        y: Math.round(cardY),
        width: cardWidth,
        height: cardHeight,
        fill: col.stickyFill,
        text: cardText,
        zIndex: ++currentZ,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });
    });
  });

  return elements;
}

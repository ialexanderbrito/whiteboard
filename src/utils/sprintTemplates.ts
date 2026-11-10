import type { CanvasElement } from '../types/element';

export type TemplateRoleCategory =
  | 'all'
  | 'agile'
  | 'product'
  | 'engineering'
  | 'design';

export interface TemplateCategoryOption {
  id: TemplateRoleCategory;
  label: string;
  shortLabel: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategoryOption[] = [
  { id: 'all', label: 'Todos os perfis', shortLabel: 'Todos' },
  { id: 'agile', label: 'Agilidade & Scrum', shortLabel: 'Agilidade' },
  { id: 'product', label: 'Produto & Estratégia', shortLabel: 'Produto' },
  { id: 'engineering', label: 'Fluxos & Arquitetura', shortLabel: 'Engenharia' },
  { id: 'design', label: 'Design & Ideação', shortLabel: 'Design' },
];

export interface SprintColumnConfig {
  title: string;
  frameFill: string;
  frameStroke: string;
  stickyFill: string;
  cards: string[];
}

export type TemplatePreviewVariant =
  | 'retro_4ls'
  | 'flowchart'
  | 'roadmap'
  | 'kanban'
  | 'prototype'
  | 'eisenhower'
  | 'crazy8s'
  | 'story_map'
  | 'lean_canvas'
  | 'retro_agile'
  | 'daily'
  | 'retro_focus';

export interface SprintTemplate {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  badge: string;
  iconName: string;
  category: Exclude<TemplateRoleCategory, 'all'>;
  previewVariant: TemplatePreviewVariant;
  accentColor: string;
  columns: SprintColumnConfig[];
  customGenerator?: (
    origin: { x: number; y: number },
    user: { uid: string; displayName: string },
    startingZIndex: number
  ) => Omit<CanvasElement, 'id' | 'updatedAt'>[];
}

export const SPRINT_TEMPLATES: SprintTemplate[] = [
  {
    id: 'retro_4ls',
    title: 'Retrospectiva 4Ls (Liked, Learned, Lacked, Longed)',
    shortTitle: 'Retrospectiva 4Ls',
    description: 'Dinâmica ágil para avaliar a sprint em 4 prismas: O que gostamos, aprendemos, faltou e desejamos.',
    badge: '4 Raias • Dinâmica Ágil',
    iconName: 'Heart',
    category: 'agile',
    previewVariant: 'retro_4ls',
    accentColor: '#e11d48',
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
    id: 'flowchart_architecture',
    title: 'Fluxograma & Arquitetura de Sistema',
    shortTitle: 'Fluxograma',
    description: 'Mapeie fluxos de decisão, arquitetura de APIs e jornadas lógicas com nós conectados, losangos de decisão e setas.',
    badge: 'Diagrama • Formas & Setas',
    iconName: 'GitBranch',
    category: 'engineering',
    previewVariant: 'flowchart',
    accentColor: '#2563eb',
    columns: [
      {
        title: '🟢 Entrada & Gatilho',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: ['Requisição do Cliente (HTTPS)', 'Validação de Payload & Rate Limit'],
      },
      {
        title: '🔷 Regra de Decisão',
        frameFill: 'rgba(254, 249, 195, 0.45)',
        frameStroke: '#f59e0b',
        stickyFill: '#fef08a',
        cards: ['Sessão Autenticada?', 'Permissão RBAC Verificada?'],
      },
      {
        title: '⚡ Processamento Core',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#3b82f6',
        stickyFill: '#bae6fd',
        cards: ['Executar Regra de Negócio', 'Publicar Evento Assíncrono na Fila'],
      },
      {
        title: '🏁 Saída & Observabilidade',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#8b5cf6',
        stickyFill: '#ddd6fe',
        cards: ['Retornar 200 OK com Cache', 'Registrar Telemetria & Logs'],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // Moldura principal do diagrama
      els.push({
        type: 'frame',
        x: ox,
        y: oy,
        width: 1180,
        height: 620,
        text: '⚡ Fluxograma de Decisão & Arquitetura de Serviço',
        fill: 'rgba(248, 250, 252, 0.5)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Nó 1: Início (Circle)
      els.push({
        type: 'circle',
        x: ox + 130,
        y: oy + 250,
        width: 120,
        height: 120,
        radius: 60,
        fill: '#bbf7d0',
        stroke: '#059669',
        strokeWidth: 2,
        text: 'Início\nRequest HTTP',
        fontSize: 14,
        fontWeight: 'bold',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta 1 -> 2
      els.push({
        type: 'arrow',
        x: ox + 195,
        y: oy + 250,
        points: [0, 0, 75, 0],
        stroke: '#334155',
        strokeWidth: 3,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Nó 2: API Gateway (Rect)
      els.push({
        type: 'rect',
        x: ox + 280,
        y: oy + 205,
        width: 190,
        height: 90,
        fill: '#bae6fd',
        stroke: '#0284c7',
        strokeWidth: 2,
        text: 'API Gateway\n& Rate Limiter',
        fontSize: 15,
        fontWeight: 'bold',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta 2 -> 3 (Decisão)
      els.push({
        type: 'arrow',
        x: ox + 475,
        y: oy + 250,
        points: [0, 0, 75, 0],
        stroke: '#334155',
        strokeWidth: 3,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Nó 3: Losango de Decisão (Diamond)
      els.push({
        type: 'diamond',
        x: ox + 560,
        y: oy + 180,
        width: 170,
        height: 140,
        fill: '#fef08a',
        stroke: '#ca8a04',
        strokeWidth: 2,
        text: 'Token JWT\nVálido?',
        fontSize: 14,
        fontWeight: 'bold',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta 3 -> 4 (Caminho Feliz: Sim)
      els.push({
        type: 'arrow',
        x: ox + 735,
        y: oy + 250,
        points: [0, 0, 85, 0],
        stroke: '#059669',
        strokeWidth: 3,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Nó 4: Serviço Core & DB (Rect)
      els.push({
        type: 'rect',
        x: ox + 830,
        y: oy + 120,
        width: 240,
        height: 95,
        fill: '#ddd6fe',
        stroke: '#7c3aed',
        strokeWidth: 2,
        text: 'Executar Transação Core\n& Atualizar Cache Redis',
        fontSize: 14,
        fontWeight: 'bold',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta 4 -> 5
      els.push({
        type: 'arrow',
        x: ox + 950,
        y: oy + 220,
        points: [0, 0, 0, 65],
        stroke: '#059669',
        strokeWidth: 3,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Nó 5: Resposta 200 OK (Rect)
      els.push({
        type: 'rect',
        x: ox + 830,
        y: oy + 295,
        width: 240,
        height: 85,
        fill: '#bbf7d0',
        stroke: '#059669',
        strokeWidth: 2,
        text: '✅ Retornar 200 OK\nPayload JSON Assinado',
        fontSize: 14,
        fontWeight: 'bold',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta 3 -> 6 (Caminho de Erro: Não)
      els.push({
        type: 'arrow',
        x: ox + 645,
        y: oy + 325,
        points: [0, 0, 0, 105],
        stroke: '#e11d48',
        strokeWidth: 3,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Nó 6: Erro 401 (Rect)
      els.push({
        type: 'rect',
        x: ox + 535,
        y: oy + 440,
        width: 220,
        height: 85,
        fill: '#fecdd3',
        stroke: '#e11d48',
        strokeWidth: 2,
        text: '⛔ Retornar 401 Unauthorized\n& Registrar Auditoria',
        fontSize: 14,
        fontWeight: 'bold',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Post-its de notas de arquitetura
      els.push({
        type: 'sticky',
        x: ox + 80,
        y: oy + 410,
        width: 200,
        height: 125,
        fill: '#fff9b1',
        text: '📌 SLA de Latência:\nP95 < 80ms no Gateway com circuit-breaker ativo.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 300,
        y: oy + 410,
        width: 200,
        height: 125,
        fill: '#bae6fd',
        text: '🔒 Segurança:\nRotacionar chaves JWT a cada 24h via KMS.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      return els;
    },
  },
  {
    id: 'roadmap_planning',
    title: 'Planejamento de Roadmap (Now, Next, Later)',
    shortTitle: 'Roadmap de Produto',
    description: 'Estruture as prioridades trimestrais do produto com clareza entre execução imediata, validação e visão de longo prazo.',
    badge: '4 Horizontes • Produto',
    iconName: 'Map',
    category: 'product',
    previewVariant: 'roadmap',
    accentColor: '#7c3aed',
    columns: [
      {
        title: '🚀 Agora (Q1 • Em Execução)',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: [
          'Onboarding em 1 clique com templates visuais',
          'Paleta de Comandos (Ctrl+K) instantânea',
          'Sincronização em tempo real com zero latência',
          'Exportação de quadros em alta definição (PNG/JSON)',
          'Permissões granulares e proteção por senha',
          'Mini-mapa vivo na grade do Dashboard',
        ],
      },
      {
        title: '🎯 Próximo (Q2 • Descoberta & Beta)',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#3b82f6',
        stickyFill: '#bae6fd',
        cards: [
          'Conectores magnéticos inteligentes entre formas',
          ' Comentários ancorados em elementos com threads',
          'Histórico de versões com restauração em 1 clique',
          'Templates personalizados salvos pela equipe',
          'Modo apresentação guiada com foco de câmera',
          'Atalhos rápidos para agrupamento de elementos',
        ],
      },
      {
        title: '🔭 Depois (Q3 • Escala & Integrações)',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#8b5cf6',
        stickyFill: '#ddd6fe',
        cards: [
          'Integração bidirecional com Linear e GitHub Issues',
          'Notificações de menções via Slack e Discord',
          'Pastas e espaços de trabalho por squad',
          'Importação direta de arquivos CSV para post-its',
          'Dashboard de métricas de engajamento do time',
          'API pública com webhooks para automações',
        ],
      },
      {
        title: '💡 Visão & Apostas (Q4+)',
        frameFill: 'rgba(254, 249, 195, 0.45)',
        frameStroke: '#f59e0b',
        stickyFill: '#fef08a',
        cards: [
          'Agrupamento automático de post-its por afinidade',
          'Resumo executivo automático pós-retrospectiva',
          'Aplicativo desktop nativo com suporte offline',
          'Biblioteca comunitária de templates abertos',
        ],
      },
    ],
  },
  {
    id: 'kanban_sprint',
    title: 'Kanban de Sprint Completo',
    shortTitle: 'Kanban de Sprint',
    description: 'Fluxo completo de entrega com 4 raias e post-its em grade por raia: A Fazer, Em Andamento, Revisão/QA e Concluído.',
    badge: '4 Raias • 44 Cards',
    iconName: 'LayoutGrid',
    category: 'agile',
    previewVariant: 'kanban',
    accentColor: '#3b82f6',
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
    id: 'wireframe_prototype',
    title: 'Protótipo & Wireframe de Interface',
    shortTitle: 'Protótipo UI',
    description: 'Desenhe fluxos de telas, hierarquia de componentes e jornada de conversão antes de ir para o código.',
    badge: '3 Telas • Wireframe UI',
    iconName: 'LayoutTemplate',
    category: 'design',
    previewVariant: 'prototype',
    accentColor: '#0284c7',
    columns: [
      {
        title: '📱 Tela 1: Hero & Proposta de Valor',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#0284c7',
        stickyFill: '#bae6fd',
        cards: ['Headline clara focada no resultado', 'CTA primário de baixa fricção (Sem cartão)'],
      },
      {
        title: '🧭 Tela 2: Onboarding Ativo',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#7c3aed',
        stickyFill: '#ddd6fe',
        cards: ['Seleção de template em 1 clique', 'Barra de progresso iniciada em 25%'],
      },
      {
        title: '✨ Tela 3: Momento Aha & Convite',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: ['Primeiro quadro gerado com dados reais', 'Compartilhamento rápido de link curto'],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      const screens = [
        {
          title: '📱 1. Landing Page & Proposta de Valor',
          stroke: '#0284c7',
          fill: 'rgba(239, 246, 255, 0.45)',
          headerText: 'Navbar • Logo + Login Rápido',
          heroFill: '#bae6fd',
          heroText: 'Headline de Alto Impacto\n"Do caos ao alinhamento em 30 segundos"',
          ctaFill: '#0284c7',
          ctaText: 'Começar Agora Grátis →',
          noteFill: '#fff9b1',
          noteText: '💡 UX Copy: Mostrar prova de valor antes de pedir cadastro longo.',
        },
        {
          title: '🧭 2. Escolha de Template (Onboarding)',
          stroke: '#7c3aed',
          fill: 'rgba(245, 243, 255, 0.45)',
          headerText: 'Passo 1 de 2 • O que vamos criar hoje?',
          heroFill: '#ddd6fe',
          heroText: 'Galeria de Templates por Perfil\n[Retro 4Ls]  [Fluxograma]  [Roadmap]',
          ctaFill: '#7c3aed',
          ctaText: 'Criar Quadro com Template ✨',
          noteFill: '#f5d0fe',
          noteText: '🎯 Efeito Default: Pré-selecionar o template mais popular do perfil.',
        },
        {
          title: '🚀 3. Workspace Ativo (Momento Aha)',
          stroke: '#059669',
          fill: 'rgba(240, 253, 244, 0.45)',
          headerText: 'Quadro Ativo • 4 Colaboradores Online',
          heroFill: '#bbf7d0',
          heroText: 'Canvas Populando Automaticamente\nRaias, Post-its e Timer Prontos para Uso',
          ctaFill: '#059669',
          ctaText: 'Compartilhar Link com a Equipe 🔗',
          noteFill: '#bbf7d0',
          noteText: '⚡ TTV < 10s: Usuário já experimenta o produto funcionando na hora.',
        },
      ];

      screens.forEach((scr, idx) => {
        const sx = ox + idx * 430;
        const sy = oy;

        // Frame da Tela
        els.push({
          type: 'frame',
          x: sx,
          y: sy,
          width: 370,
          height: 540,
          text: scr.title,
          fill: scr.fill,
          stroke: scr.stroke,
          strokeWidth: 2,
          zIndex: ++z,
          updatedBy: user.uid,
          updatedByName: user.displayName,
        });

        // Barra de Topo do Wireframe
        els.push({
          type: 'rect',
          x: sx + 24,
          y: sy + 52,
          width: 322,
          height: 46,
          fill: '#ffffff',
          stroke: '#94a3b8',
          strokeWidth: 2,
          text: scr.headerText,
          fontSize: 12,
          fontWeight: 'bold',
          zIndex: ++z,
          updatedBy: user.uid,
          updatedByName: user.displayName,
        });

        // Bloco Central Hero / Conteúdo
        els.push({
          type: 'rect',
          x: sx + 24,
          y: sy + 114,
          width: 322,
          height: 155,
          fill: scr.heroFill,
          stroke: scr.stroke,
          strokeWidth: 2,
          text: scr.heroText,
          fontSize: 14,
          fontWeight: 'bold',
          zIndex: ++z,
          updatedBy: user.uid,
          updatedByName: user.displayName,
        });

        // Botão CTA Principal
        els.push({
          type: 'rect',
          x: sx + 24,
          y: sy + 288,
          width: 322,
          height: 56,
          fill: scr.ctaFill,
          stroke: scr.stroke,
          strokeWidth: 2,
          textColor: '#ffffff',
          text: scr.ctaText,
          fontSize: 14,
          fontWeight: 'bold',
          zIndex: ++z,
          updatedBy: user.uid,
          updatedByName: user.displayName,
        });

        // Post-it de anotação de Design/Conversão
        els.push({
          type: 'sticky',
          x: sx + 24,
          y: sy + 368,
          width: 322,
          height: 140,
          fill: scr.noteFill,
          text: scr.noteText,
          zIndex: ++z,
          updatedBy: user.uid,
          updatedByName: user.displayName,
        });

        // Seta conectora entre telas
        if (idx < screens.length - 1) {
          els.push({
            type: 'arrow',
            x: sx + 375,
            y: sy + 240,
            points: [0, 0, 50, 0],
            stroke: '#334155',
            strokeWidth: 3,
            zIndex: ++z,
            updatedBy: user.uid,
            updatedByName: user.displayName,
          });
        }
      });

      return els;
    },
  },
  {
    id: 'matriz_eisenhower',
    title: 'Matriz Eisenhower de Priorização',
    shortTitle: 'Matriz Eisenhower',
    description: 'Classifique demandas e tarefas em 4 quadrantes clássicos: Fazer Agora, Agendar, Delegar e Eliminar.',
    badge: '4 Quadrantes • Priorização',
    iconName: 'CheckSquare',
    category: 'product',
    previewVariant: 'eisenhower',
    accentColor: '#ef4444',
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
    id: 'brainstorming_crazy8s',
    title: 'Brainstorming & Ideação Crazy 8s',
    shortTitle: 'Brainstorming Crazy 8s',
    description: 'Exercício dinâmico para gerar 8 soluções rápidas em poucos minutos, filtrando as hipóteses mais promissoras.',
    badge: '4 Raias • Ideação Dinâmica',
    iconName: 'Lightbulb',
    category: 'design',
    previewVariant: 'crazy8s',
    accentColor: '#ca8a04',
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
  {
    id: 'user_story_map',
    title: 'User Story Mapping & Jornada',
    shortTitle: 'User Story Mapping',
    description: 'Mapeie a jornada completa do usuário dividida em atividades, MVP Release 1 e Expansão Release 2.',
    badge: '4 Raias • Product Discovery',
    iconName: 'Users',
    category: 'product',
    previewVariant: 'story_map',
    accentColor: '#059669',
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
    id: 'lean_canvas',
    title: 'Lean Canvas de Modelo de Negócio',
    shortTitle: 'Lean Canvas',
    description: 'Valide a viabilidade da sua ideia ou produto com os blocos fundamentais de proposta de valor e mercado.',
    badge: '5 Raias • Visão de Negócio',
    iconName: 'Briefcase',
    category: 'product',
    previewVariant: 'lean_canvas',
    accentColor: '#8b5cf6',
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
    id: 'retro_geral',
    title: 'Retrospectiva Ágil Clássica',
    shortTitle: 'Retrospectiva Ágil',
    description: 'Cerimônia completa de retrospectiva com 3 raias: o que funcionou bem, o que podemos melhorar e plano de ações com responsáveis.',
    badge: '3 Raias • 33 Cards',
    iconName: 'Sparkles',
    category: 'agile',
    previewVariant: 'retro_agile',
    accentColor: '#10b981',
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
    id: 'daily_standup',
    title: 'Daily Standup da Equipe',
    shortTitle: 'Daily Standup',
    description: 'Check-in diário com 3 raias clássicas do Scrum para alinhar entregas e remover bloqueios com rapidez.',
    badge: '3 Raias • Rotina Diária',
    iconName: 'CalendarDays',
    category: 'agile',
    previewVariant: 'daily',
    accentColor: '#0284c7',
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
    id: 'retro_foco',
    title: 'Acertos, Erros e Aprendizados',
    shortTitle: 'Acertos & Aprendizados',
    description: 'Formato direto e focado: o que deu certo, o que deu errado e o que a equipe aprendeu para a próxima iteração.',
    badge: '3 Raias • 33 Cards',
    iconName: 'Target',
    category: 'agile',
    previewVariant: 'retro_focus',
    accentColor: '#8b5cf6',
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
];

export function generateTemplateElements(
  template: SprintTemplate,
  origin: { x: number; y: number },
  user: { uid: string; displayName: string },
  startingZIndex: number
): Omit<CanvasElement, 'id' | 'updatedAt'>[] {
  if (template.customGenerator) {
    return template.customGenerator(origin, user, startingZIndex);
  }

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

import type { CanvasElement } from '../types/element';
import { getElementBounds } from './alignment.ts';

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
  | 'retro_focus'
  | 'raci_matrix'
  | 'tech_spec'
  | 'revenue_funnel'
  | 'mindmap_discovery'
  | 'kanban_interactive'
  | 'rice_matrix'
  | 'post_mortem'
  | 'design_system';

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
  {
    id: 'matriz_raci',
    title: 'Matriz RACI & Governança de Squad',
    shortTitle: 'Matriz RACI',
    description: 'Defina claramente papéis e responsabilidades (Responsible, Accountable, Consulted, Informed) com tabela estruturada e checklist de governança.',
    badge: 'Tabela • Governança & Squad',
    iconName: 'Table2',
    category: 'agile',
    previewVariant: 'raci_matrix',
    accentColor: '#0284c7',
    columns: [
      {
        title: '📋 Atividades & Entregas Críticas',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#0284c7',
        stickyFill: '#bae6fd',
        cards: ['Definição de Visão', 'Discovery & Protótipos', 'Arquitetura de API', 'Desenvolvimento de Features', 'Validação de DoD'],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // Tabela RACI Nativa
      const raciData = [
        ['Atividade / Entrega Crítica', 'Product Manager', 'Tech Lead', 'Product Designer', 'Engenheiro(a) Core', 'QA / Testes'],
        ['Definição de Visão & Priorização', 'A (Accountable)', 'C (Consultado)', 'C (Consultado)', 'I (Informado)', 'I (Informado)'],
        ['Discovery & Protótipos de Alta Fidelidade', 'C (Consultado)', 'I (Informado)', 'A / R (Responsável)', 'C (Consultado)', 'I (Informado)'],
        ['Arquitetura Técnica & ADRs de API', 'I (Informado)', 'A (Accountable)', 'I (Informado)', 'R (Responsável)', 'C (Consultado)'],
        ['Desenvolvimento de Features & PRs', 'I (Informado)', 'C (Consultado)', 'I (Informado)', 'A / R (Responsável)', 'C (Consultado)'],
        ['Critérios de Aceite & Validação de DoD', 'C (Consultado)', 'C (Consultado)', 'C (Consultado)', 'C (Consultado)', 'A / R (Responsável)'],
      ];
      const colWidths = [240, 110, 105, 120, 125, 100];
      const tableW = colWidths.reduce((a, b) => a + b, 0); // 800
      const tableH = 42 + 5 * 38; // 232

      els.push({
        type: 'table',
        x: ox + 40,
        y: oy + 40,
        width: tableW,
        height: tableH,
        tableData: raciData,
        tableColWidths: colWidths,
        tableHeaderRow: true,
        fill: '#0284c7',
        stroke: '#0284c7',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Micro-Widget Checklist de Definition of Done (DoD)
      els.push({
        type: 'checklist',
        x: ox + 880,
        y: oy + 40,
        width: 320,
        height: 250,
        checklistTitle: 'Definition of Done (DoD) da Squad',
        checklistItems: [
          { id: 'dod_1', text: 'Código revisado por ao menos 1 par (PR aprovado)', completed: true },
          { id: 'dod_2', text: 'Testes unitários e de integração verdes no CI', completed: true },
          { id: 'dod_3', text: 'Critérios de acessibilidade WCAG 2.2 atendidos', completed: false },
          { id: 'dod_4', text: 'Documentação de API atualizada no Swagger/ADR', completed: false },
          { id: 'dod_5', text: 'Validação e fumaça em ambiente de Staging', completed: false },
        ],
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Post-its de Legenda RACI e Regras
      els.push({
        type: 'sticky',
        x: ox + 40,
        y: oy + 300,
        width: 250,
        height: 140,
        fill: '#bae6fd',
        text: '📌 Legenda RACI:\n• R (Responsible): Quem executa o trabalho\n• A (Accountable): Quem responde pelo sucesso\n• C (Consulted): Especialista consultado\n• I (Informed): Informado do progresso',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 310,
        y: oy + 300,
        width: 250,
        height: 140,
        fill: '#fef08a',
        text: '⚡ Regra de Ouro:\nApenas UM Accountable (A) por linha para evitar diluição de responsabilidade entre lideranças.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 580,
        y: oy + 300,
        width: 260,
        height: 140,
        fill: '#bbf7d0',
        text: '🎯 Alinhamento de Expectativas:\nRevise a matriz no início de cada trimestre ou sempre que novos membros entrarem na squad.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      return els;
    },
  },
  {
    id: 'rfc_tech_spec',
    title: 'RFC Técnica & Arquitetura de Microsserviços',
    shortTitle: 'RFC & Arquitetura',
    description: 'Especificação técnica com contrato de código tipado, tabela comparativa de SLAs/latência e checklist de prontidão de produção.',
    badge: 'Código & Tabela • Tech Spec',
    iconName: 'Code2',
    category: 'engineering',
    previewVariant: 'tech_spec',
    accentColor: '#7c3aed',
    columns: [
      {
        title: '💻 Especificação da API',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#7c3aed',
        stickyFill: '#ddd6fe',
        cards: ['Contrato TypeScript da Mensagem', 'Idempotência via Redis'],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // 1. Bloco de Código Nativo (Contrato TypeScript)
      const codeSnippet = `interface ProcessOrderPayload {
  readonly orderId: string;
  readonly customerId: string;
  readonly idempotencyKey: string;
  readonly amountCents: number;
}

export async function processOrderEvent(
  payload: ProcessOrderPayload
): Promise<{ status: 'ACCEPTED'; latencyMs: number }> {
  // Lock distribuído com TTL de 30s no Redis
  const acquired = await redis.set(
    \`lock:\${payload.idempotencyKey}\`,
    '1',
    'EX', 30, 'NX'
  );
  if (!acquired) throw new Error('Duplicate event');
  return { status: 'ACCEPTED', latencyMs: 24 };
}`;

      els.push({
        type: 'code',
        x: ox + 40,
        y: oy + 40,
        width: 480,
        height: 310,
        text: codeSnippet,
        codeLanguage: 'typescript',
        codeTheme: 'dark',
        fontSize: 13,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 2. Tabela de Requisitos Não-Funcionais & SLAs
      const slaData = [
        ['Camada / Microsserviço', 'P95 SLA', 'P99 SLA', 'Resiliência & Fallback'],
        ['API Gateway & Auth', '< 25ms', '< 50ms', 'Cache JWT distribuído no Edge'],
        ['Serviço Core de Pedidos', '< 80ms', '< 140ms', 'Circuit-breaker com fila dead-letter'],
        ['Banco Principal (PostgreSQL)', '< 15ms', '< 35ms', 'Pool PgBouncer + Read Replicas'],
        ['Barramento Kafka', '< 40ms', '< 90ms', 'Particionamento por customerId'],
      ];
      const colWidths = [190, 85, 85, 240];
      const tableW = colWidths.reduce((a, b) => a + b, 0); // 600
      const tableH = 42 + 4 * 38; // 194

      els.push({
        type: 'table',
        x: ox + 550,
        y: oy + 40,
        width: tableW,
        height: tableH,
        tableData: slaData,
        tableColWidths: colWidths,
        tableHeaderRow: true,
        fill: '#7c3aed',
        stroke: '#7c3aed',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 3. Checklist de Production Readiness (Prontidão de Produção)
      els.push({
        type: 'checklist',
        x: ox + 550,
        y: oy + 260,
        width: 600,
        height: 220,
        checklistTitle: 'Production Readiness Checklist (SRE & Segurança)',
        checklistItems: [
          { id: 'sre_1', text: 'Idempotência testada sob rajada concorrente de requisições', completed: true },
          { id: 'sre_2', text: 'Dashboards de latência P95/P99 e taxa de erro no Grafana', completed: true },
          { id: 'sre_3', text: 'Script de migração de banco com rollback automático validado', completed: false },
          { id: 'sre_4', text: 'Secrets gerenciados via KMS (nenhuma chave hardcoded)', completed: true },
          { id: 'sre_5', text: 'Testes de carga com 2.000 requisições/s sem degradação', completed: false },
        ],
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 4. Post-its com Princípios de Arquitetura e Decisão
      els.push({
        type: 'sticky',
        x: ox + 40,
        y: oy + 375,
        width: 230,
        height: 135,
        fill: '#ddd6fe',
        text: '🔒 Decisão de Arquitetura (ADR #042):\nAdotamos semântica at-least-once com idempotência na ponta consumidora para tolerar reentregas.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 290,
        y: oy + 375,
        width: 230,
        height: 135,
        fill: '#bbf7d0',
        text: '📊 Observabilidade:\nTodo log deve conter traceId, spanId e customerId para rastreamento ponta-a-ponta no Jaeger.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      return els;
    },
  },
  {
    id: 'revenue_funnel_rcd',
    title: 'Funil de Conversão & Retenção SaaS (Revenue-Centric Design)',
    shortTitle: 'Funil de Conversão SaaS',
    description: 'Framework baseado nos 101 princípios de Richard (@richardrx): Níveis de Schwartz, TTV acelerado, Pricing GBB e Retenção Zeigarnik.',
    badge: '4 Etapas • Richard RCD',
    iconName: 'TrendingUp',
    category: 'product',
    previewVariant: 'revenue_funnel',
    accentColor: '#10b981',
    columns: [
      {
        title: '🎯 1. Aquisição (Awareness de Schwartz)',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#3b82f6',
        stickyFill: '#bae6fd',
        cards: [
          'Eugene Schwartz: Identificar nível de consciência (Inconsciente, Dor, Solução ou Produto)',
          'Neutralidade é omissão: A interface deve guiar a decisão ideal do cliente',
          'Headline de alto contraste: Focada no resultado tangível, nunca em features genéricas',
          'CTA de baixa fricção: Sem cartão de crédito para eliminar hesitação inicial',
        ],
      },
      {
        title: '⚡ 2. Ativação & Time-to-Value (TTV)',
        frameFill: 'rgba(240, 253, 244, 0.45)',
        frameStroke: '#10b981',
        stickyFill: '#bbf7d0',
        cards: [
          'Value first, ask later: Entregue prova de valor antes que o usuário duvide da escolha',
          'Momento Aha em menos de 30 segundos (TTV veloz reduz churn inicial em 40%)',
          'Efeito Default: Pré-selecione o fluxo mais comum e poupe carga cognitiva',
          'Empty state vivo: Apresente o produto com dados de exemplo prontos para uso',
        ],
      },
      {
        title: '💎 3. Monetização & Psicologia de Preço',
        frameFill: 'rgba(254, 243, 199, 0.45)',
        frameStroke: '#f59e0b',
        stickyFill: '#fde68a',
        cards: [
          'Good-Better-Best (GBB): 3 planos com a opção intermediária em destaque',
          'Efeito Chafariz (Decoy Effect): O plano Pro faz o plano Team parecer pechincha',
          'Preço é um filtro: Quem paga valoriza a ferramenta e abre menos tickets triviais',
          'Expansão baseada em uso: Notifique upgrade no momento exato do limite atingido',
        ],
      },
      {
        title: '🛡️ 4. Retenção & Redução de Churn',
        frameFill: 'rgba(245, 243, 255, 0.45)',
        frameStroke: '#8b5cf6',
        stickyFill: '#ddd6fe',
        cards: [
          'Efeito Zeigarnik: Tarefas em andamento no produto geram impulso de retorno',
          'Perceived Loss: A perda do histórico criado retém mais do que promessa de novo recurso',
          'Expectation Debt: Nunca prometa o que o software não entrega perfeitamente no dia 1',
          'Cancelamento transparente: Dificultar offboarding destrói a confiança na marca',
        ],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // 1. Cascata Visual do Funil (4 Etapas Proporcionais com métricas e cores temáticas)
      // Etapa 1: Aquisição
      els.push({
        type: 'rect',
        x: ox + 40,
        y: oy + 40,
        width: 440,
        height: 64,
        fill: '#eff6ff',
        stroke: '#2563eb',
        strokeWidth: 2,
        text: '🎯 1. AQUISIÇÃO • 10.000 Visitantes / mês\nConsciência de Schwartz & Headlines de Alto Contraste',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#1e3a8a',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta de Conversão 1 -> 2
      els.push({
        type: 'arrow',
        x: ox + 260,
        y: oy + 104,
        points: [0, 0, 0, 36],
        stroke: '#2563eb',
        strokeWidth: 2.5,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Etapa 2: Ativação
      els.push({
        type: 'rect',
        x: ox + 80,
        y: oy + 140,
        width: 360,
        height: 64,
        fill: '#ecfeff',
        stroke: '#0891b2',
        strokeWidth: 2,
        text: '⚡ 2. ATIVAÇÃO • 3.200 Ativados (32%)\nMomento Aha em < 30s & Value First, Ask Later',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#155e75',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta de Conversão 2 -> 3
      els.push({
        type: 'arrow',
        x: ox + 260,
        y: oy + 204,
        points: [0, 0, 0, 36],
        stroke: '#0891b2',
        strokeWidth: 2.5,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Etapa 3: Monetização
      els.push({
        type: 'rect',
        x: ox + 120,
        y: oy + 240,
        width: 280,
        height: 64,
        fill: '#f0fdf4',
        stroke: '#059669',
        strokeWidth: 2,
        text: '💎 3. MONETIZAÇÃO • 800 Clientes (25%)\nGood-Better-Best (GBB) & Decoy Effect',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#14532d',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Seta de Conversão 3 -> 4
      els.push({
        type: 'arrow',
        x: ox + 260,
        y: oy + 304,
        points: [0, 0, 0, 36],
        stroke: '#059669',
        strokeWidth: 2.5,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Etapa 4: Retenção
      els.push({
        type: 'rect',
        x: ox + 160,
        y: oy + 340,
        width: 200,
        height: 64,
        fill: '#faf5ff',
        stroke: '#7c3aed',
        strokeWidth: 2,
        text: '🛡️ 4. RETENÇÃO\n720 Ativos (90% D30) • NRR 118%\nEfeito Zeigarnik',
        fontSize: 11,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#581c87',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 2. Tabela Nativa de Métricas de Conversão & Benchmarks SaaS (Lado Direito Superior)
      const funnelTableData = [
        ['Estágio do Funil', 'Métrica Principal', 'Benchmark SaaS', 'Alavanca RCD (Richard)'],
        ['1. Aquisição', 'CTR do CTA Principal (Hero)', '> 8.5%', 'Headline com foco no resultado tangível'],
        ['2. Ativação', 'Time-to-Value (TTV até o Aha)', '< 30 segundos', 'Empty state vivo com dados pré-preenchidos'],
        ['3. Monetização', 'Conversão Trial para Pago', '> 6.0%', 'Plano intermediário destacado (Efeito Decoy)'],
        ['4. Retenção', 'Retenção de Cohort (Mês 1)', '> 75%', 'Efeito Zeigarnik com progresso visível'],
        ['5. Expansão', 'Net Revenue Retention (NRR)', '> 115%', 'Upgrade no momento exato do limite de uso'],
      ];
      const colWidths = [150, 190, 120, 260];
      const tableW = colWidths.reduce((a, b) => a + b, 0); // 720
      const tableH = 42 + 5 * 38; // 232

      els.push({
        type: 'table',
        x: ox + 520,
        y: oy + 40,
        width: tableW,
        height: tableH,
        tableData: funnelTableData,
        tableColWidths: colWidths,
        tableHeaderRow: true,
        fill: '#10b981',
        stroke: '#10b981',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 3. Micro-Widget Checklist de Auditoria CRO & Alavancas de Receita
      els.push({
        type: 'checklist',
        x: ox + 520,
        y: oy + 292,
        width: 720,
        height: 220,
        checklistTitle: 'Auditoria de Conversão & UX (Checklist RCD)',
        checklistItems: [
          { id: 'rcd_1', text: 'Headline passa no teste dos 5 segundos (clareza irrecusável)', completed: true },
          { id: 'rcd_2', text: 'Eliminar fricção no cadastro (sem cartão de crédito inicial)', completed: true },
          { id: 'rcd_3', text: 'Momento Aha demonstrado antes do pedido de upgrade', completed: true },
          { id: 'rcd_4', text: 'Tabela de preços com opção Good-Better-Best e âncora clara', completed: false },
          { id: 'rcd_5', text: 'Prevenção de churn com oferta de pausa e suporte imediato', completed: false },
        ],
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 4. Cards Estratégicos com os 101 Princípios RCD (Abaixo)
      const cardW = 285;
      const cardH = 175;
      const cardY = oy + 535;

      els.push({
        type: 'sticky',
        x: ox + 40,
        y: cardY,
        width: cardW,
        height: cardH,
        fill: '#bae6fd',
        text: '🎯 1. Aquisição (Awareness):\n• Eugene Schwartz: Mapeie o nível de consciência (Inconsciente, Dor ou Solução).\n• Neutralidade é omissão: A interface deve direcionar sem hesitação.\n• Headline de contraste: Fale do resultado, nunca de features genéricas.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 345,
        y: cardY,
        width: cardW,
        height: cardH,
        fill: '#cffafe',
        text: '⚡ 2. Ativação & TTV:\n• Value first, ask later: Entregue a prova antes que o usuário duvide.\n• TTV < 30s: Reduz o churn inicial em até 40%.\n• Efeito Default: A opção pré-selecionada define o comportamento da massa.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 650,
        y: cardY,
        width: cardW,
        height: cardH,
        fill: '#bbf7d0',
        text: '💎 3. Monetização & Preço:\n• GBB (Good-Better-Best): O plano do meio é o campeão de vendas.\n• Decoy Effect: O plano Pro ancora o plano Team como vantajoso.\n• Preço é um filtro: Quem paga valoriza a ferramenta.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 955,
        y: cardY,
        width: cardW,
        height: cardH,
        fill: '#ddd6fe',
        text: '🛡️ 4. Retenção & Anti-Churn:\n• Efeito Zeigarnik: Tarefas em andamento puxam o usuário de volta.\n• Perceived Loss: Perder dados criados retém mais que promessas.\n• Expectation Debt: Nunca prometa o que não cumpre no D1.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      return els;
    },
  },
  {
    id: 'discovery_mindmap',
    title: 'Product Discovery & Árvore de Oportunidades (OST)',
    shortTitle: 'Árvore de Oportunidades',
    description: 'Mapeamento visual baseado em Teresa Torres: conecte objetivos de negócio a dores dos usuários, soluções potenciais e hipóteses de validação.',
    badge: 'Mapa Mental • Product Discovery',
    iconName: 'GitBranch',
    category: 'product',
    previewVariant: 'mindmap_discovery',
    accentColor: '#0284c7',
    columns: [
      {
        title: '🌳 Discovery & Hipóteses',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#0284c7',
        stickyFill: '#bae6fd',
        cards: ['Objetivo de Negócio', 'Dores dos Usuários', 'Soluções Hipotéticas', 'Experimentos Rápidos'],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // Nó Raiz do Mapa Mental
      els.push({
        type: 'rect',
        x: ox + 40,
        y: oy + 230,
        width: 250,
        height: 80,
        fill: '#eff6ff',
        stroke: '#2563eb',
        strokeWidth: 2,
        text: '🎯 Objetivo de Negócio\nAumentar Ativação para 60%',
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#1e3a8a',
        mindmapRootId: 'self',
        mindmapDirection: 'right',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Oportunidades (Nível 1)
      els.push({
        type: 'rect',
        x: ox + 360,
        y: oy + 120,
        width: 240,
        height: 70,
        fill: '#fef3c7',
        stroke: '#d97706',
        strokeWidth: 2,
        text: '⚠️ Oportunidade 1\nUsuário não sabe como começar',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#78350f',
        mindmapDirection: 'right',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'rect',
        x: ox + 360,
        y: oy + 340,
        width: 240,
        height: 70,
        fill: '#fef3c7',
        stroke: '#d97706',
        strokeWidth: 2,
        text: '👥 Oportunidade 2\nDificuldade de convidar a equipe',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#78350f',
        mindmapDirection: 'right',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Setas conectoras curvas Raiz -> Oportunidades
      els.push({
        type: 'arrow',
        x: ox + 290,
        y: oy + 270,
        points: [0, 0, 70, -115],
        stroke: '#2563eb',
        strokeWidth: 2.5,
        connectorStyle: 'curved',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'arrow',
        x: ox + 290,
        y: oy + 270,
        points: [0, 0, 70, 105],
        stroke: '#2563eb',
        strokeWidth: 2.5,
        connectorStyle: 'curved',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Soluções (Nível 2)
      els.push({
        type: 'rect',
        x: ox + 670,
        y: oy + 60,
        width: 250,
        height: 65,
        fill: '#dcfce7',
        stroke: '#16a34a',
        strokeWidth: 2,
        text: '💡 Solução A\nGaleria de Templates em 1 Clique',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#14532d',
        mindmapDirection: 'right',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'rect',
        x: ox + 670,
        y: oy + 160,
        width: 250,
        height: 65,
        fill: '#dcfce7',
        stroke: '#16a34a',
        strokeWidth: 2,
        text: '💡 Solução B\nTour Interativo de 30 Segundos',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#14532d',
        mindmapDirection: 'right',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'rect',
        x: ox + 670,
        y: oy + 310,
        width: 250,
        height: 65,
        fill: '#dcfce7',
        stroke: '#16a34a',
        strokeWidth: 2,
        text: '💡 Solução C\nLink de Convidado Sem Cadastro',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#14532d',
        mindmapDirection: 'right',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'rect',
        x: ox + 670,
        y: oy + 410,
        width: 250,
        height: 65,
        fill: '#dcfce7',
        stroke: '#16a34a',
        strokeWidth: 2,
        text: '💡 Solução D\nConvite com 1 Clique via Slack',
        fontSize: 13,
        fontWeight: 'bold',
        textAlign: 'center',
        textColor: '#14532d',
        mindmapDirection: 'right',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Conectores Oportunidade 1 -> Soluções A e B
      els.push({
        type: 'arrow',
        x: ox + 600,
        y: oy + 155,
        points: [0, 0, 70, -62],
        stroke: '#d97706',
        strokeWidth: 2,
        connectorStyle: 'curved',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });
      els.push({
        type: 'arrow',
        x: ox + 600,
        y: oy + 155,
        points: [0, 0, 70, 38],
        stroke: '#d97706',
        strokeWidth: 2,
        connectorStyle: 'curved',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Conectores Oportunidade 2 -> Soluções C e D
      els.push({
        type: 'arrow',
        x: ox + 600,
        y: oy + 375,
        points: [0, 0, 70, -32],
        stroke: '#d97706',
        strokeWidth: 2,
        connectorStyle: 'curved',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });
      els.push({
        type: 'arrow',
        x: ox + 600,
        y: oy + 375,
        points: [0, 0, 70, 68],
        stroke: '#d97706',
        strokeWidth: 2,
        connectorStyle: 'curved',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Post-its de Hipóteses de Experimento e Métricas
      els.push({
        type: 'sticky',
        x: ox + 980,
        y: oy + 80,
        width: 250,
        height: 140,
        fill: '#bae6fd',
        text: '🧪 Experimento Rápido:\nRodar teste A/B oferecendo 3 templates sugeridos no onboarding.\nMeta: TTV < 45s.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 980,
        y: oy + 280,
        width: 250,
        height: 140,
        fill: '#fde68a',
        text: '📊 Métrica de Sucesso (OKR):\nTaxa de quadros criados que recebem ao menos 2 colaboradores no primeiro dia.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      return els;
    },
  },
  {
    id: 'kanban_interactive_sprint',
    title: 'Sprint Kanban com WIP & Fluxo Contínuo',
    shortTitle: 'Kanban Interativo WIP',
    description: 'Quadro Kanban dinâmico e interativo com raias WIP, arrasto de cartões, checklist de acordos de trabalho e métricas da sprint.',
    badge: 'Widget Kanban • Squad & WIP',
    iconName: 'FolderKanban',
    category: 'agile',
    previewVariant: 'kanban_interactive',
    accentColor: '#2563eb',
    columns: [
      {
        title: '⚡ Fluxo da Sprint',
        frameFill: 'rgba(239, 246, 255, 0.45)',
        frameStroke: '#2563eb',
        stickyFill: '#bae6fd',
        cards: ['Backlog da Sprint', 'Em Desenvolvimento', 'Code Review & QA', 'Pronto para Deploy'],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // Widget Kanban Nativo Completo
      const kanbanCols = [
        {
          id: 'k_todo',
          title: 'A Fazer (Backlog)',
          color: '#64748b',
          cards: [
            { id: 'kc_1', title: 'Autenticação SSO via Google e GitHub', tag: 'Auth' },
            { id: 'kc_2', title: 'Otimização de WebGL / Canvas a 60fps', tag: 'Perf' },
            { id: 'kc_3', title: 'Suíte de testes E2E com Playwright', tag: 'QA' },
          ],
        },
        {
          id: 'k_wip',
          title: 'Em Desenvolvimento (WIP: 2)',
          color: '#2563eb',
          cards: [
            { id: 'kc_4', title: 'Widgets de Tabela e Código no whiteboard', tag: 'Core' },
            { id: 'kc_5', title: 'Sincronização em tempo real de cursores', tag: 'Collab' },
          ],
        },
        {
          id: 'k_review',
          title: 'Code Review & QA (WIP: 2)',
          color: '#8b5cf6',
          cards: [
            { id: 'kc_6', title: 'Auditoria de Acessibilidade WCAG 2.2', tag: 'A11y' },
            { id: 'kc_7', title: 'Histórico e Snapshots com Undo Atômico', tag: 'Sync' },
          ],
        },
        {
          id: 'k_done',
          title: 'Pronto / Concluído (Done)',
          color: '#10b981',
          cards: [
            { id: 'kc_8', title: 'Lançamento v1.5 com novos templates', tag: 'Release', completed: true },
            { id: 'kc_9', title: 'Migração segura para Firebase v10', tag: 'Infra', completed: true },
          ],
        },
      ];

      els.push({
        type: 'kanban',
        x: ox + 40,
        y: oy + 40,
        width: 980,
        height: 380,
        kanbanTitle: 'Sprint Kanban • Squad Core',
        kanbanColumns: kanbanCols,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Checklist de Acordos de Trabalho & Cerimônias
      els.push({
        type: 'checklist',
        x: ox + 1050,
        y: oy + 40,
        width: 330,
        height: 240,
        checklistTitle: 'Acordos de Trabalho (Squad Rules)',
        checklistItems: [
          { id: 'sq_1', text: 'Daily assíncrona até as 10h com bloqueios', completed: true },
          { id: 'sq_2', text: 'Limite estrito de WIP: máx 2 itens por dev', completed: true },
          { id: 'sq_3', text: 'PRs revisados em até 4 horas úteis', completed: false },
          { id: 'sq_4', text: 'Nenhum commit direto na branch main', completed: true },
          { id: 'sq_5', text: 'Refinamento de backlog toda quarta 14h', completed: false },
        ],
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Post-its de Metas e Capacidade
      els.push({
        type: 'sticky',
        x: ox + 1050,
        y: oy + 300,
        width: 330,
        height: 120,
        fill: '#fef08a',
        text: '🎯 Meta da Sprint (Sprint Goal):\nEntregar a suíte completa de Templates & Frameworks com alta fidelidade visual e zero bugs no canvas.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      return els;
    },
  },
  {
    id: 'rice_prioritization',
    title: 'Matriz RICE de Priorização de Backlog',
    shortTitle: 'Priorização RICE',
    description: 'Pontuação objetiva de iniciativas com tabela calculada: Alcance (Reach), Impacto (Impact), Confiança (Confidence) e Esforço (Effort).',
    badge: 'Tabela • RICE Score',
    iconName: 'Calculator',
    category: 'product',
    previewVariant: 'rice_matrix',
    accentColor: '#ea580c',
    columns: [
      {
        title: '📊 Scorecard de Priorização',
        frameFill: 'rgba(255, 247, 237, 0.45)',
        frameStroke: '#ea580c',
        stickyFill: '#fed7aa',
        cards: ['Iniciativas', 'Alcance (R)', 'Impacto (I)', 'Confiança (C)', 'Esforço (E)', 'RICE Score'],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // Tabela RICE
      const riceData = [
        ['Iniciativa / Hipótese de Produto', 'Alcance (R)', 'Impacto (I)', 'Confiança (C)', 'Esforço (E)', 'RICE Score', 'Decisão'],
        ['Templates & Frameworks em 1 clique', '10.000 / mês', '3 (Massivo)', '90%', '1 sprint', '27.000', '🟢 Fazer Já (Q1)'],
        ['Widgets de Tabela e Bloco de Código', '6.000 / mês', '2 (Alto)', '80%', '2 sprints', '4.800', '🟢 Fazer Já (Q1)'],
        ['Integração com Jira e GitHub Issues', '4.000 / mês', '2 (Alto)', '70%', '3 sprints', '1.867', '🟡 Próxima Sprint'],
        ['App Desktop Nativo com Modo Offline', '2.500 / mês', '1 (Médio)', '50%', '6 sprints', '208', '🔴 Backlog Futuro'],
      ];
      const colWidths = [220, 100, 95, 100, 90, 100, 135];
      const tableW = colWidths.reduce((a, b) => a + b, 0); // 840
      const tableH = 42 + 4 * 38; // 194

      els.push({
        type: 'table',
        x: ox + 40,
        y: oy + 40,
        width: tableW,
        height: tableH,
        tableData: riceData,
        tableColWidths: colWidths,
        tableHeaderRow: true,
        fill: '#ea580c',
        stroke: '#ea580c',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Checklist de Critérios de Avaliação
      els.push({
        type: 'checklist',
        x: ox + 920,
        y: oy + 40,
        width: 330,
        height: 210,
        checklistTitle: 'Critérios de Avaliação RICE',
        checklistItems: [
          { id: 'rc_1', text: 'Alcance validado por métricas do Mixpanel/GA4', completed: true },
          { id: 'rc_2', text: 'Impacto alinhado com o OKR trimestral', completed: true },
          { id: 'rc_3', text: 'Confiança acima de 70% apoiada em entrevistas', completed: false },
          { id: 'rc_4', text: 'Esforço estimado junto com o Tech Lead', completed: true },
        ],
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // Post-its com a Fórmula e Recomendações
      els.push({
        type: 'sticky',
        x: ox + 40,
        y: oy + 265,
        width: 260,
        height: 135,
        fill: '#fed7aa',
        text: '📐 Fórmula do RICE:\n(Alcance × Impacto × Confiança) ÷ Esforço\n\nQuanto maior o escore final, maior o retorno por esforço de engenharia.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 320,
        y: oy + 265,
        width: 260,
        height: 135,
        fill: '#fef08a',
        text: '💡 Dica de Calibração:\nEvite dar nota máxima de Confiança (100%) a menos que já exista protótipo com teste de fumaça aprovado.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      els.push({
        type: 'sticky',
        x: ox + 600,
        y: oy + 265,
        width: 280,
        height: 135,
        fill: '#bbf7d0',
        text: '🎯 Linha de Corte:\nIniciativas com escore acima de 3.000 entram automaticamente na sprint corrente.',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      return els;
    },
  },
  {
    id: 'post_mortem_incident',
    title: 'Post-Mortem de Incidente & Análise de Causa Raiz',
    shortTitle: 'Post-Mortem & SRE',
    description: 'Estrutura blameless para análise de incidentes críticos: timeline com impacto e severidade, cadeia dos 5 Porquês, checklist de confiabilidade SRE e script de mitigação.',
    badge: 'Tabela • SRE & Engenharia',
    iconName: 'AlertTriangle',
    category: 'engineering',
    previewVariant: 'post_mortem',
    accentColor: '#ef4444',
    columns: [
      {
        title: '🚨 Linha do Tempo & Triage',
        frameFill: 'rgba(254, 242, 242, 0.45)',
        frameStroke: '#ef4444',
        stickyFill: '#fecdd3',
        cards: [
          '14:02 UTC: Alerta P1 no Datadog (Latência p99 > 2.5s)',
          '14:08 UTC: War Room aberta no Slack com SRE on-call',
          '14:15 UTC: Tráfego redirecionado para cluster secundário',
          '14:28 UTC: Rollback do release v2.14 concluído com sucesso',
        ],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // 1. Tabela Nativa de Linha do Tempo do Incidente
      const timelineData = [
        ['Horário (UTC)', 'Etapa / Evento', 'Severidade', 'Impacto nos Usuários', 'Ação / Mitigação Executada'],
        ['14:02', 'Alarme P1: Latência p99 > 2.5s', 'P1 - Crítico', '28% das requisições com timeout', 'Abertura imediata de War Room'],
        ['14:08', 'Triage do Spike de CPU', 'P1 - Crítico', 'Degradação em /api/checkout', 'Isolamento de tráfego do microsserviço'],
        ['14:15', 'Ativação de Circuit Breaker', 'P2 - Alto', 'Fallback para cache local ativo', 'Drenagem de conexões presas'],
        ['14:28', 'Rollback do Release v2.14', 'P3 - Médio', 'Taxa de erro normalizada (< 0.1%)', 'Deploy da imagem estável anterior'],
        ['14:40', 'Resolução Completa', 'Normal', 'Operação 100% restabelecida', 'Início da investigação de causa raiz'],
      ];
      const colWidths = [110, 200, 110, 180, 220];
      const tableW = colWidths.reduce((a, b) => a + b, 0); // 820
      const tableH = 42 + 5 * 38; // 232

      els.push({
        type: 'table',
        x: ox + 40,
        y: oy + 40,
        width: tableW,
        height: tableH,
        tableData: timelineData,
        tableColWidths: colWidths,
        tableHeaderRow: true,
        fill: '#ef4444',
        stroke: '#ef4444',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 2. Micro-Widget Checklist de Ações Preventivas SRE (Lado Direito)
      els.push({
        type: 'checklist',
        x: ox + 890,
        y: oy + 40,
        width: 380,
        height: 232,
        checklistTitle: 'Plano de Ação SRE (Prevenção)',
        checklistItems: [
          { id: 'sre_1', text: 'Alerta preditivo de saturação de pool de conexões', completed: true },
          { id: 'sre_2', text: 'Adicionar timeout explícito (800ms) no client gRPC', completed: true },
          { id: 'sre_3', text: 'Executar teste de carga antes do deploy de sexta', completed: false },
          { id: 'sre_4', text: 'Automatizar rollback canário no ArgoCD/Kubernetes', completed: false },
          { id: 'sre_5', text: 'Atualizar runbook de emergência para plantonistas', completed: false },
        ],
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 3. Bloco de Código com Configuração Resiliente de Circuit Breaker
      els.push({
        type: 'code',
        x: ox + 40,
        y: oy + 295,
        width: 600,
        height: 180,
        text: `// Política de Resiliência & Circuit Breaker (Cockatiel / Polly)\nexport const paymentCircuitBreaker = circuitBreaker(handleAll, {\n  halfOpenAfter: 15 * 1000, // 15s em meia-abertura\n  breaker: new ConsecutiveBreaker(5), // Abre após 5 falhas seguidas\n});\n\nexport const resilientFetch = wrap(\n  timeout(1200, TimeoutStrategy.Aggressive),\n  paymentCircuitBreaker,\n  retry(handleAll, { maxAttempts: 2 })\n);`,
        codeLanguage: 'typescript',
        codeTheme: 'dark',
        fontSize: 12,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 4. Cadeia de 5 Porquês (5 Whys Root Cause Analysis)
      const whyX = ox + 665;
      const whys = [
        { label: '1. Por que o serviço caiu?', text: 'Pool de conexões com o Postgres esgotou em 90s.', fill: '#fee2e2' },
        { label: '2. Por que o pool esgotou?', text: 'Query de checkout sem paginação bloqueou threads.', fill: '#fef3c7' },
        { label: '3. Por que a query travou?', text: 'Faltava índice composto em (user_id, status).', fill: '#fef9c3' },
        { label: '4. Causa Raiz & Ação Definitiva', text: 'Faltava validação de índices em PRs no CI/CD.', fill: '#dcfce7' },
      ];

      whys.forEach((why, idx) => {
        els.push({
          type: 'rect',
          x: whyX,
          y: oy + 295 + idx * 46,
          width: 605,
          height: 38,
          fill: why.fill,
          stroke: idx === 3 ? '#16a34a' : '#d1d5db',
          strokeWidth: 1.5,
          text: `${why.label} → ${why.text}`,
          fontSize: 12,
          fontWeight: 'bold',
          textAlign: 'left',
          textColor: '#0f172a',
          zIndex: ++z,
          updatedBy: user.uid,
          updatedByName: user.displayName,
        });
      });

      return els;
    },
  },
  {
    id: 'design_system_spec',
    title: 'Design System & Auditoria de UI Polish (Emil & WCAG)',
    shortTitle: 'Design System & Polish',
    description: 'Especificação de interface e auditoria de polimento baseada em Emil Kowalski: tokens de contraste WCAG 2.2, físicas de micro-interações, checklist de acessibilidade e código de componente acessível.',
    badge: 'Design System • Acessibilidade',
    iconName: 'Palette',
    category: 'design',
    previewVariant: 'design_system',
    accentColor: '#ec4899',
    columns: [
      {
        title: '🎨 Tokens & Componentes',
        frameFill: 'rgba(253, 242, 248, 0.45)',
        frameStroke: '#ec4899',
        stickyFill: '#fbcfe8',
        cards: [
          'Button: Primary, Secondary, Ghost & Destructive',
          'Input: Default, Hover, Focus-Visible & Error',
          'Dialog: Animação suave com mola (damping 24)',
          'Toast: Posição fixa inferior com fila inteligente',
        ],
      },
    ],
    customGenerator: (origin, user, startingZIndex) => {
      const els: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [];
      let z = startingZIndex;
      const ox = Math.round(origin.x);
      const oy = Math.round(origin.y);

      // 1. Tabela Nativa de Tokens do Design System
      const dsTokensData = [
        ['Componente', 'Variante', 'Estado de Interação', 'Contraste (WCAG 2.2)', 'Classes Tailwind / Tokens'],
        ['Button', 'Primary (Solid)', 'Default / Hover', '8.5:1 (AAA Pass)', 'bg-zinc-900 hover:bg-zinc-800 text-white'],
        ['Input', 'Outline Text', 'Focus-Visible', '4.9:1 (AA Pass)', 'ring-2 ring-primary ring-offset-2 border-transparent'],
        ['Modal / Dialog', 'Centered Popover', 'Entering (Spring)', '11.2:1 (AAA Pass)', 'animate-in zoom-in-95 backdrop-blur-md'],
        ['Badge', 'Pill Status', 'Active / Success', '5.2:1 (AA Pass)', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
        ['Feedback Toast', 'Floating Alert', 'Mounting', '9.1:1 (AAA Pass)', 'shadow-xl rounded-xl border border-zinc-200'],
      ];
      const colWidths = [120, 150, 140, 160, 270];
      const tableW = colWidths.reduce((a, b) => a + b, 0); // 840
      const tableH = 42 + 5 * 38; // 232

      els.push({
        type: 'table',
        x: ox + 40,
        y: oy + 40,
        width: tableW,
        height: tableH,
        tableData: dsTokensData,
        tableColWidths: colWidths,
        tableHeaderRow: true,
        fill: '#ec4899',
        stroke: '#ec4899',
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 2. Micro-Widget Checklist de Auditoria WCAG 2.2 & Emil Polish (Lado Direito)
      els.push({
        type: 'checklist',
        x: ox + 910,
        y: oy + 40,
        width: 370,
        height: 232,
        checklistTitle: 'Auditoria de Acessibilidade & UI Polish',
        checklistItems: [
          { id: 'wcag_1', text: 'Navegação por teclado completa com Tab e Shift+Tab', completed: true },
          { id: 'wcag_2', text: 'Focus ring nítido visível apenas via teclado (focus-visible)', completed: true },
          { id: 'wcag_3', text: 'Área de toque mínima de 44x44px em botões móveis', completed: true },
          { id: 'wcag_4', text: 'Físicas de mola naturais: damping suave sem bounce excessivo', completed: false },
          { id: 'wcag_5', text: 'Suporte a redução de movimento (prefers-reduced-motion)', completed: false },
        ],
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 3. Bloco de Código de Componente Acessível com Primitivas ARIA
      els.push({
        type: 'code',
        x: ox + 40,
        y: oy + 295,
        width: 540,
        height: 195,
        text: `// Componente com Emil Kowalski Polish & Acessibilidade WCAG\nexport const AccessibleButton = React.forwardRef<HTMLButtonElement, ButtonProps>(\n  ({ children, variant = 'primary', isLoading, ...props }, ref) => (\n    <button\n      ref={ref}\n      aria-busy={isLoading}\n      className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5\n                 rounded-lg font-medium text-sm transition-all duration-150\n                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary\n                 active:scale-[0.98] disabled:opacity-50 select-none cursor-pointer"\n      {...props}\n    >\n      {isLoading ? <Spinner className="size-4 animate-spin mr-2" /> : children}\n    </button>\n  )\n);`,
        codeLanguage: 'typescript',
        codeTheme: 'dark',
        fontSize: 12,
        zIndex: ++z,
        updatedBy: user.uid,
        updatedByName: user.displayName,
      });

      // 4. Post-its com Princípios de Emil Kowalski
      const emilPrinciples = [
        { title: '🌿 Físicas de Mola Reais', text: 'Animações devem expressar peso e momentum natural, evitando curvas lineares artificiais.', fill: '#fce7f3' },
        { title: '⚡ Latência Percebida Zero', text: 'Feedback imediato no pointerdown com UI otimista antes mesmo da resposta do servidor.', fill: '#fed7aa' },
        { title: '📐 Tipografia de Alto Contraste', text: 'Escala tipográfica nítida com entrelinha confortável e espaçamento consistente em grade 4px.', fill: '#bae6fd' },
        { title: '🔍 Feedback Tátil & Estados', text: 'Hover, active e focus contam uma história coesa de profundidade através de elevação e bordas.', fill: '#bbf7d0' },
      ];

      emilPrinciples.forEach((principle, idx) => {
        const px = ox + 605 + (idx % 2) * 335;
        const py = oy + 295 + Math.floor(idx / 2) * 98;
        els.push({
          type: 'sticky',
          x: px,
          y: py,
          width: 320,
          height: 90,
          fill: principle.fill,
          text: `${principle.title}\n${principle.text}`,
          fontSize: 12,
          zIndex: ++z,
          updatedBy: user.uid,
          updatedByName: user.displayName,
        });
      });

      return els;
    },
  },
];

export function generateTemplateElements(
  template: SprintTemplate,
  origin: { x: number; y: number },
  user: { uid: string; displayName: string },
  startingZIndex: number
): Omit<CanvasElement, 'id' | 'updatedAt'>[] {
  let currentZ = startingZIndex;

  // 1. Caso possua gerador personalizado (ex: Fluxograma, Wireframe)
  if (template.customGenerator) {
    const rawElements = template.customGenerator(origin, user, startingZIndex + 1);
    if (!rawElements || rawElements.length === 0) return [];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const el of rawElements) {
      const b = getElementBounds(el as CanvasElement);
      if (b.left < minX) minX = b.left;
      if (b.top < minY) minY = b.top;
      if (b.right > maxX) maxX = b.right;
      if (b.bottom > maxY) maxY = b.bottom;
    }

    const padX = 40;
    const padTop = 56;
    const padBottom = 40;

    const parentFrame: Omit<CanvasElement, 'id' | 'updatedAt'> = {
      type: 'frame',
      x: Math.round(minX - padX),
      y: Math.round(minY - padTop),
      width: Math.round(maxX - minX + padX * 2),
      height: Math.round(maxY - minY + padTop + padBottom),
      text: template.title,
      fill: 'rgba(248, 250, 252, 0.35)',
      stroke: template.accentColor || '#3b82f6',
      strokeWidth: 2,
      dash: [], // borda contínua discreta e editorial
      zIndex: ++currentZ,
      updatedBy: user.uid,
      updatedByName: user.displayName,
    };

    // Garantir que os elementos internos tenham zIndex superior ao frame pai
    const adjustedElements = rawElements.map((el) => ({
      ...el,
      zIndex: ++currentZ,
    }));

    return [parentFrame, ...adjustedElements];
  }

  // 2. Templates estruturados em colunas/raias (Retrospectivas, Kanban, Lean Canvas, etc.)
  const columnWidth = 460;
  const cardWidth = 200;
  const cardHeight = 120;
  const cardGapX = 16;
  const cardGapY = 16;
  const paddingX = 22;
  const paddingTop = 44;
  const gapBetweenColumns = 36;

  const parentPaddingX = 36;
  const parentPaddingTop = 56;
  const parentPaddingBottom = 36;

  const numCols = template.columns.length;
  const columnsTotalWidth = numCols * columnWidth + (numCols - 1) * gapBetweenColumns;
  const parentWidth = Math.round(columnsTotalWidth + parentPaddingX * 2);

  // Calcula a altura uniforme das colunas para alinhamento estético de alto padrão
  let maxColHeight = 560;
  template.columns.forEach((col) => {
    const cardCount = col.cards.length;
    const rows = Math.ceil(cardCount / 2);
    const calculatedHeight = paddingTop + rows * (cardHeight + cardGapY) + 24;
    if (calculatedHeight > maxColHeight) {
      maxColHeight = calculatedHeight;
    }
  });

  const parentHeight = Math.round(parentPaddingTop + maxColHeight + parentPaddingBottom);
  const parentX = Math.round(origin.x);
  const parentY = Math.round(origin.y);

  // Moldura Pai que encapsula todo o template
  const parentFrame: Omit<CanvasElement, 'id' | 'updatedAt'> = {
    type: 'frame',
    x: parentX,
    y: parentY,
    width: parentWidth,
    height: parentHeight,
    text: template.title,
    fill: 'rgba(248, 250, 252, 0.35)',
    stroke: template.accentColor || '#64748b',
    strokeWidth: 2,
    dash: [], // borda contínua discreta e editorial
    zIndex: ++currentZ,
    updatedBy: user.uid,
    updatedByName: user.displayName,
  };

  const elements: Omit<CanvasElement, 'id' | 'updatedAt'>[] = [parentFrame];

  template.columns.forEach((col, colIndex) => {
    const colX = Math.round(parentX + parentPaddingX + colIndex * (columnWidth + gapBetweenColumns));
    const colY = Math.round(parentY + parentPaddingTop);

    // Sub-moldura / Raia com cor e estilo de identidade da coluna
    elements.push({
      type: 'frame',
      x: colX,
      y: colY,
      width: columnWidth,
      height: maxColHeight,
      text: col.title,
      fill: col.frameFill,
      stroke: col.frameStroke,
      strokeWidth: 2,
      dash: [8, 5],
      zIndex: ++currentZ,
      updatedBy: user.uid,
      updatedByName: user.displayName,
    });

    // Post-its organizados em grade de 2 colunas dentro da raia
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

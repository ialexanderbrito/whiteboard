import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { 
  SPRINT_TEMPLATES, 
  generateTemplateElements 
} from '../src/utils/sprintTemplates.ts';

const mockUser = { uid: 'user_alexander', displayName: 'Alexander Brito' };

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('Templates & Frameworks: catalogo expandido com novos templates baseados em widgets reais', () => {
  assert.equal(SPRINT_TEMPLATES.length, 20, 'Catalogo expandido deve conter 20 templates');

  const requiredIds = [
    'retro_4ls',
    'flowchart_architecture',
    'roadmap_planning',
    'kanban_sprint',
    'wireframe_prototype',
    'matriz_eisenhower',
    'brainstorming_crazy8s',
    'user_story_map',
    'lean_canvas',
    'retro_geral',
    'daily_standup',
    'retro_foco',
    'matriz_raci',
    'rfc_tech_spec',
    'revenue_funnel_rcd',
    'discovery_mindmap',
    'kanban_interactive_sprint',
    'rice_prioritization',
    'post_mortem_incident',
    'design_system_spec',
  ];

  for (const id of requiredIds) {
    const tmpl = SPRINT_TEMPLATES.find((t) => t.id === id);
    assert.ok(tmpl, `Template ${id} deve existir no catálogo`);
    assert.ok(tmpl.title, `Template ${id} deve ter título`);
    assert.ok(tmpl.badge, `Template ${id} deve ter badge`);
    assert.ok(tmpl.description, `Template ${id} deve ter descrição`);
    assert.ok(tmpl.previewVariant, `Template ${id} deve ter previewVariant`);
  }
});

test('Templates & Frameworks: Matriz RACI gera Tabela nativa, Checklist de DoD e Post-its', () => {
  const raci = SPRINT_TEMPLATES.find((t) => t.id === 'matriz_raci');
  assert.ok(raci, 'Template matriz_raci deve existir');

  const elements = generateTemplateElements(raci, { x: 50, y: 50 }, mockUser, 10);
  assert.ok(elements.length > 0, 'Deve gerar elementos');

  // Primeiro elemento é a moldura pai
  assert.equal(elements[0].type, 'frame');
  assert.equal(elements[0].text, raci.title);

  // Deve conter tabela com dados RACI
  const tableEl = elements.find((el) => el.type === 'table');
  assert.ok(tableEl, 'Deve gerar elemento do tipo table');
  assert.ok(Array.isArray(tableEl.tableData), 'tableData deve ser um array de linhas');
  assert.equal(tableEl.tableData[0][0], 'Atividade / Entrega Crítica');
  assert.equal(tableEl.tableHeaderRow, true);

  // Deve conter checklist de DoD
  const checklistEl = elements.find((el) => el.type === 'checklist');
  assert.ok(checklistEl, 'Deve gerar elemento do tipo checklist');
  assert.match(checklistEl.checklistTitle, /Definition of Done/i);
  assert.ok(checklistEl.checklistItems.length >= 4);

  // Deve conter notas adesivas explicativas
  const stickies = elements.filter((el) => el.type === 'sticky');
  assert.ok(stickies.length >= 3, 'Deve conter post-its com legenda RACI e regras');
});

test('Templates & Frameworks: RFC Técnica gera Bloco de Código tipado, Tabela de SLAs e Checklist SRE', () => {
  const rfc = SPRINT_TEMPLATES.find((t) => t.id === 'rfc_tech_spec');
  assert.ok(rfc, 'Template rfc_tech_spec deve existir');

  const elements = generateTemplateElements(rfc, { x: 80, y: 80 }, mockUser, 20);
  assert.equal(elements[0].type, 'frame');

  // Bloco de código
  const codeEl = elements.find((el) => el.type === 'code');
  assert.ok(codeEl, 'Deve gerar elemento do tipo code');
  assert.equal(codeEl.codeLanguage, 'typescript');
  assert.equal(codeEl.codeTheme, 'dark');
  assert.match(codeEl.text, /processOrderEvent/);

  // Tabela de SLAs
  const tableEl = elements.find((el) => el.type === 'table');
  assert.ok(tableEl, 'Deve conter tabela de SLAs e requisitos');
  assert.match(tableEl.tableData[0][0], /Camada/i);

  // Checklist de SRE
  const checklistEl = elements.find((el) => el.type === 'checklist');
  assert.ok(checklistEl, 'Deve conter checklist de prontidão de produção');
  assert.match(checklistEl.checklistTitle, /Production Readiness/i);
});

test('Templates & Frameworks: Funil RCD implementa os 4 estágios estratégicos de Richard (@richardrx)', () => {
  const rcd = SPRINT_TEMPLATES.find((t) => t.id === 'revenue_funnel_rcd');
  assert.ok(rcd, 'Template revenue_funnel_rcd deve existir');
  assert.equal(rcd.category, 'product');
  assert.equal(rcd.columns.length, 4);

  const colTitles = rcd.columns.map((c) => c.title).join(' ');
  assert.match(colTitles, /Aquisição/i);
  assert.match(colTitles, /Ativação/i);
  assert.match(colTitles, /Monetização/i);
  assert.match(colTitles, /Retenção/i);

  const allCardsText = rcd.columns.flatMap((c) => c.cards).join(' ');
  assert.match(allCardsText, /Eugene Schwartz/i);
  assert.match(allCardsText, /Value first/i);
  assert.match(allCardsText, /Good-Better-Best/i);
  assert.match(allCardsText, /Zeigarnik/i);

  const elements = generateTemplateElements(rcd, { x: 0, y: 0 }, mockUser, 5);
  assert.equal(elements[0].type, 'frame');
  assert.equal(elements[0].text, rcd.title);

  // Cascata visual do funil (4 caixas dimensionadas em cascata com setas)
  const funnelSteps = elements.filter((el) => el.type === 'rect' && el.text && el.text.includes('•'));
  assert.equal(funnelSteps.length, 4, 'Deve conter 4 etapas visuais do funil');

  const funnelArrows = elements.filter((el) => el.type === 'arrow');
  assert.ok(funnelArrows.length >= 3, 'Deve conter setas de fluxo conectando os estágios do funil');

  // Tabela nativa de métricas e benchmarks
  const tableEl = elements.find((el) => el.type === 'table');
  assert.ok(tableEl, 'Deve conter tabela nativa de métricas e benchmarks SaaS');
  assert.equal(tableEl.tableData[0][0], 'Estágio do Funil');

  // Checklist nativo de CRO
  const checklistEl = elements.find((el) => el.type === 'checklist');
  assert.ok(checklistEl, 'Deve conter checklist nativo de auditoria CRO e alavancas RCD');
  assert.match(checklistEl.checklistTitle, /Auditoria de Conversão/i);

  // Cards estratégicos dos 4 pilares
  const stickies = elements.filter((el) => el.type === 'sticky');
  assert.equal(stickies.length, 4, 'Deve conter os 4 cards estratégicos de Revenue-Centric Design');
});

test('Templates & Frameworks: Discovery Mind Map gera nós conectados de Opportunity Solution Tree', () => {
  const ost = SPRINT_TEMPLATES.find((t) => t.id === 'discovery_mindmap');
  assert.ok(ost, 'Template discovery_mindmap deve existir');

  const elements = generateTemplateElements(ost, { x: 100, y: 100 }, mockUser, 1);
  assert.equal(elements[0].type, 'frame');

  // Nó raiz com mindmapRootId
  const rootNode = elements.find((el) => el.type === 'rect' && el.mindmapRootId === 'self');
  assert.ok(rootNode, 'Deve conter nó raiz de mapa mental');
  assert.match(rootNode.text, /Objetivo de Negócio/i);

  // Nós filhos conectados
  const childNodes = elements.filter((el) => el.type === 'rect' && el.mindmapDirection === 'right' && el.mindmapRootId !== 'self');
  assert.ok(childNodes.length >= 4, 'Deve conter nós de oportunidades e soluções');

  // Setas conectoras curvas
  const arrows = elements.filter((el) => el.type === 'arrow');
  assert.ok(arrows.length >= 4, 'Deve conter setas conectoras curvas');
  assert.equal(arrows[0].connectorStyle, 'curved');
});

test('Templates & Frameworks: Sprint Kanban Interativo inclui widget kanban nativo e checklist de regras', () => {
  const kanbanTmpl = SPRINT_TEMPLATES.find((t) => t.id === 'kanban_interactive_sprint');
  assert.ok(kanbanTmpl, 'Template kanban_interactive_sprint deve existir');

  const elements = generateTemplateElements(kanbanTmpl, { x: 150, y: 150 }, mockUser, 1);
  assert.equal(elements[0].type, 'frame');

  // Widget Kanban nativo
  const kanbanWidget = elements.find((el) => el.type === 'kanban');
  assert.ok(kanbanWidget, 'Deve conter widget kanban');
  assert.ok(kanbanWidget.kanbanColumns.length >= 4, 'Deve conter 4 colunas no kanban');
  assert.match(kanbanWidget.kanbanTitle, /Sprint Kanban/i);

  // Checklist de Squad Rules
  const checklistEl = elements.find((el) => el.type === 'checklist');
  assert.ok(checklistEl, 'Deve conter checklist de acordos de trabalho');

  // Meta da Sprint em post-it
  const stickyEl = elements.find((el) => el.type === 'sticky');
  assert.ok(stickyEl, 'Deve conter post-it com Meta da Sprint');
  assert.match(stickyEl.text, /Meta da Sprint/i);
});

test('Templates & Frameworks: Matriz RICE gera tabela de pontuação com colunas R, I, C, E e Checklist', () => {
  const rice = SPRINT_TEMPLATES.find((t) => t.id === 'rice_prioritization');
  assert.ok(rice, 'Template rice_prioritization deve existir');

  const elements = generateTemplateElements(rice, { x: 200, y: 200 }, mockUser, 1);
  assert.equal(elements[0].type, 'frame');

  // Tabela RICE
  const tableEl = elements.find((el) => el.type === 'table');
  assert.ok(tableEl, 'Deve conter tabela RICE');
  assert.equal(tableEl.tableData[0][0], 'Iniciativa / Hipótese de Produto');
  assert.match(tableEl.tableData[0].join(' '), /RICE Score/);

  // Checklist
  const checklistEl = elements.find((el) => el.type === 'checklist');
  assert.ok(checklistEl, 'Deve conter checklist de critérios');
});

test('Templates & Frameworks: Post-Mortem de Incidente gera Tabela de Linha do Tempo, Checklist SRE, Código TypeScript e 5 Porquês', () => {
  const pm = SPRINT_TEMPLATES.find((t) => t.id === 'post_mortem_incident');
  assert.ok(pm, 'Template post_mortem_incident deve existir');
  assert.equal(pm.category, 'engineering');

  const elements = generateTemplateElements(pm, { x: 300, y: 300 }, mockUser, 1);
  assert.equal(elements[0].type, 'frame');
  assert.match(elements[0].text, /Post-Mortem/i);

  // Tabela de Linha do Tempo
  const tableEl = elements.find((el) => el.type === 'table');
  assert.ok(tableEl, 'Deve conter tabela de linha do tempo do incidente');
  assert.match(tableEl.tableData[0][0], /Horário/i);
  assert.ok(tableEl.tableData.length >= 5);

  // Bloco de Código de Correção / Mitigação
  const codeEl = elements.find((el) => el.type === 'code');
  assert.ok(codeEl, 'Deve conter bloco de código de mitigação');
  assert.equal(codeEl.codeLanguage, 'typescript');
  assert.match(codeEl.text, /circuitBreaker/i);

  // Checklist de SRE
  const checklistEl = elements.find((el) => el.type === 'checklist');
  assert.ok(checklistEl, 'Deve conter checklist de prontidão e lições aprendidas');
  assert.match(checklistEl.checklistTitle, /Plano de Ação SRE/i);

  // Nós dos 5 Porquês (Root Cause Analysis)
  const whys = elements.filter((el) => el.type === 'rect' && el.text && (el.text.includes('Por que') || el.text.includes('Causa Raiz')));
  assert.ok(whys.length >= 4, 'Deve conter etapas da análise dos Porquês de Causa Raiz');
  const whyTexts = whys.map((s) => s.text).join(' ');
  assert.match(whyTexts, /1\. Por que/i);
  assert.match(whyTexts, /Causa Raiz/i);
});

test('Templates & Frameworks: Design System Spec gera Tabela de Tokens, Checklist WCAG 2.2, Código de Componente e Princípios de Emil', () => {
  const ds = SPRINT_TEMPLATES.find((t) => t.id === 'design_system_spec');
  assert.ok(ds, 'Template design_system_spec deve existir');
  assert.equal(ds.category, 'design');

  const elements = generateTemplateElements(ds, { x: 400, y: 400 }, mockUser, 1);
  assert.equal(elements[0].type, 'frame');
  assert.match(elements[0].text, /Design System/i);

  // Tabela de Tokens
  const tableEl = elements.find((el) => el.type === 'table');
  assert.ok(tableEl, 'Deve conter tabela de tokens de cores e contraste WCAG');
  assert.match(tableEl.tableData[0][0], /Componente/i);
  assert.match(tableEl.tableData[0].join(' '), /Contraste/i);

  // Bloco de Código com Componente Acessível
  const codeEl = elements.find((el) => el.type === 'code');
  assert.ok(codeEl, 'Deve conter bloco de código de componente React acessível');
  assert.equal(codeEl.codeLanguage, 'typescript');
  assert.match(codeEl.text, /AccessibleButton/i);
  assert.match(codeEl.text, /aria-busy/i);

  // Checklist WCAG 2.2
  const checklistEl = elements.find((el) => el.type === 'checklist');
  assert.ok(checklistEl, 'Deve conter checklist de conformidade WCAG 2.2 AA');
  assert.match(checklistEl.checklistTitle, /Auditoria de Acessibilidade/i);

  // Post-its de Princípios de UI Polish (Emil Kowalski)
  const stickies = elements.filter((el) => el.type === 'sticky');
  assert.ok(stickies.length >= 4, 'Deve conter post-its com princípios de UI polish');
  const stickyTexts = stickies.map((s) => s.text).join(' ');
  assert.match(stickyTexts, /Feedback imediato/i);
  assert.match(stickyTexts, /Físicas de Mola Reais/i);
});

test('Templates & Frameworks: Nomenclatura profissional consistente na Toolbar, Context Menu, Command Palette e Modais', () => {
  const toolbarSrc = readSource('src/components/whiteboard/Toolbar.tsx');
  const contextMenuSrc = readSource('src/components/whiteboard/BoardContextMenu.tsx');
  const shortcutsSrc = readSource('src/components/whiteboard/KeyboardShortcutsModal.tsx');
  const commandPaletteSrc = readSource('src/components/command/CommandPalette.tsx');
  const modalSrc = readSource('src/components/whiteboard/SprintTemplatesModal.tsx');
  const stripSrc = readSource('src/components/whiteboard/QuickStartTemplatesStrip.tsx');

  // Toolbar
  assert.match(toolbarSrc, /aria-label="Inserir Templates & Frameworks"/);
  assert.match(toolbarSrc, /Templates & Frameworks <span className="opacity-60 text-\[10px\]">\(S\)<\/span>/);
  assert.match(toolbarSrc, /aria-label="Componentes e Widgets Estruturados"/);
  assert.match(toolbarSrc, /Widgets & Componentes/);

  // Context Menu
  assert.match(contextMenuSrc, /Templates & Frameworks\.\.\./);

  // Keyboard Shortcuts
  assert.match(shortcutsSrc, /Templates & Frameworks/);

  // Command Palette
  assert.match(commandPaletteSrc, /Inserir Templates & Frameworks/);

  // SprintTemplatesModal
  assert.match(modalSrc, /<span>Templates & Frameworks<\/span>/);
  assert.match(modalSrc, /<TooltipContent>Inserir Templates & Frameworks<\/TooltipContent>/);

  // QuickStartTemplatesStrip previews
  assert.match(stripSrc, /case 'raci_matrix':/);
  assert.match(stripSrc, /case 'tech_spec':/);
  assert.match(stripSrc, /case 'revenue_funnel':/);
  assert.match(stripSrc, /case 'mindmap_discovery':/);
  assert.match(stripSrc, /case 'kanban_interactive':/);
  assert.match(stripSrc, /case 'rice_matrix':/);
  assert.match(stripSrc, /case 'post_mortem':/);
  assert.match(stripSrc, /case 'design_system':/);
});

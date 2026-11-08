import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Carregar logo oficial em base64 para garantir integridade e render sem dependências de rede
const logoPath = path.join(projectRoot, 'public', 'logo-full-dark.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : '';

// 2. Gerar HTML do Banner Open Graph oficial (1200x630)
// Utiliza estritamente o design system, paleta e tipografia da interface (LoginPage.tsx),
// sem elementos de autenticação (formulários/login), atuando como vitrine do produto real.
const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8" />
  <title>Mirio — Banner Open Graph Oficial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background: #09090b;
      color: #fafafa;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Container Principal 1200x630 */
    .viewport {
      position: relative;
      width: 1200px;
      height: 630px;
      display: flex;
      padding: 44px 52px;
      gap: 48px;
      background: #09090b;
      border: 1px solid #27272a;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    /* Padrão Arquitetural de Pontos do Canvas (Preto & Branco / Escala de Cinza) igual ao LoginPage.tsx */
    .dot-pattern {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(#27272a 1.2px, transparent 1.2px);
      background-size: 20px 20px;
      opacity: 0.85;
      pointer-events: none;
    }

    /* Marcações de Esquadro Arquitetural nos Cantos */
    .corner-mark {
      position: absolute;
      width: 12px;
      height: 12px;
      pointer-events: none;
      opacity: 0.35;
    }
    .corner-tl { top: 16px; left: 16px; border-top: 1.5px solid #fafafa; border-left: 1.5px solid #fafafa; }
    .corner-tr { top: 16px; right: 16px; border-top: 1.5px solid #fafafa; border-right: 1.5px solid #fafafa; }
    .corner-bl { bottom: 16px; left: 16px; border-bottom: 1.5px solid #fafafa; border-left: 1.5px solid #fafafa; }
    .corner-br { bottom: 16px; right: 16px; border-bottom: 1.5px solid #fafafa; border-right: 1.5px solid #fafafa; }

    /* LADO ESQUERDO: Apresentação do Produto & Copywriting (500px) */
    .left-section {
      position: relative;
      z-index: 10;
      width: 490px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .brand-group {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Kicker e Tag do Topo */
    .kicker-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pill-kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #27272a;
      background: rgba(24, 24, 27, 0.7);
      border-radius: 4px;
      padding: 3px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #a1a1aa;
    }
    .kicker-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #fafafa;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #27272a;
      border-radius: 4px;
      padding: 3px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #71717a;
      background: rgba(24, 24, 27, 0.4);
    }

    /* Logo Oficial */
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      height: 42px;
      width: auto;
      object-fit: contain;
    }

    /* Headline Editorial */
    .headline-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    h1.hero-title {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.035em;
      line-height: 1.12;
      color: #fafafa;
    }
    p.hero-desc {
      font-size: 14.5px;
      line-height: 1.55;
      color: #a1a1aa;
      max-width: 460px;
    }

    /* Rodapé com Métricas de Infraestrutura do LoginPage */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding-top: 18px;
      border-top: 1px solid #27272a;
    }
    .metric-card {
      display: flex;
      align-items: center;
      gap: 7px;
      border-radius: 6px;
      border: 1px solid #27272a;
      background: rgba(18, 18, 23, 0.6);
      padding: 7px 9px;
    }
    .metric-card svg {
      width: 14px;
      height: 14px;
      color: #fafafa;
      flex-shrink: 0;
    }
    .metric-content {
      display: flex;
      flex-direction: column;
    }
    .metric-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: #fafafa;
    }
    .metric-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: #71717a;
    }

    /* LADO DIREITO: Vitrine Flutuante do Canvas (Mockup de Produto) */
    .right-section {
      position: relative;
      z-index: 10;
      flex: 1;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Moldura da Janela do Canvas (Wireframe Arquitetural) */
    .canvas-window {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 12px;
      border: 1px solid #27272a;
      background: rgba(14, 14, 18, 0.85);
      backdrop-filter: blur(16px);
      box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.8),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Barra Superior da Janela */
    .canvas-header {
      height: 44px;
      padding: 0 16px;
      border-bottom: 1px solid rgba(39, 39, 42, 0.7);
      background: rgba(24, 24, 27, 0.5);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .window-dots {
      display: flex;
      gap: 6px;
    }
    .window-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #27272a;
    }

    /* Toolbar Minimalista Central */
    .stage-toolbar {
      display: flex;
      align-items: center;
      gap: 3px;
      border-radius: 6px;
      border: 1px solid #27272a;
      background: #09090b;
      padding: 2px 4px;
    }
    .stage-tool-btn {
      width: 22px;
      height: 22px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a1a1aa;
    }
    .stage-tool-btn.active {
      background: #fafafa;
      color: #09090b;
    }

    /* Avatares de Presença Online */
    .presence-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .avatar-stack {
      display: flex;
      align-items: center;
    }
    .avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1.5px solid #09090b;
      margin-left: -6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      font-weight: 700;
      color: #fafafa;
      background: #27272a;
    }
    .avatar:first-child { margin-left: 0; }
    .avatar-lead { background: #fafafa; color: #09090b; }
    .presence-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #71717a;
    }

    /* Superfície da Lousa (Canvas Infinito) */
    .canvas-stage {
      position: relative;
      flex: 1;
      width: 100%;
      background-image: radial-gradient(#27272a 1px, transparent 1px);
      background-size: 18px 18px;
    }

    /* Card 1: Planejamento de Sprint (01 // SPRINT_PLAN) */
    .card-sprint {
      position: absolute;
      left: 28px;
      top: 36px;
      width: 235px;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid #27272a;
      background: #09090b;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
    .sprint-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(39, 39, 42, 0.6);
      font-family: 'JetBrains Mono', monospace;
    }
    .sprint-title {
      font-size: 11px;
      font-weight: 700;
      color: #fafafa;
    }
    .sprint-tag {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid #27272a;
      background: rgba(24, 24, 27, 0.6);
      color: #a1a1aa;
    }
    .sprint-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #a1a1aa;
    }
    .sprint-item-done {
      color: #fafafa;
      display: flex;
      gap: 6px;
    }
    .sprint-item-pending {
      color: #71717a;
      display: flex;
      gap: 6px;
    }
    .sprint-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid rgba(39, 39, 42, 0.4);
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      color: #71717a;
    }
    .sprint-foot-bold {
      color: #fafafa;
      font-weight: 700;
    }

    /* Linha Conectora SVG Tracejada */
    .connector-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    }

    /* Card 2: Decisão de Arquitetura (02 // ARCH_DECISION) */
    .card-arch {
      position: absolute;
      right: 28px;
      bottom: 40px;
      width: 250px;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid #27272a;
      background: rgba(24, 24, 27, 0.85);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
    .arch-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 7px;
      border-bottom: 1px solid rgba(39, 39, 42, 0.6);
      font-family: 'JetBrains Mono', monospace;
    }
    .arch-title {
      font-size: 11px;
      font-weight: 700;
      color: #fafafa;
    }
    .arch-tag {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid #27272a;
      background: #09090b;
      color: #a1a1aa;
    }
    .arch-text {
      padding: 9px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      line-height: 1.45;
      color: #a1a1aa;
    }
    .arch-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      color: #fafafa;
    }
    .arch-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #fafafa;
    }

    /* CURSORES COLABORATIVOS MINIMALISTAS */
    .cursor-wrap {
      position: absolute;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .cursor-wrap svg {
      width: 14px;
      height: 14px;
    }
    .cursor-badge {
      border-radius: 4px;
      border: 1px solid #27272a;
      padding: 2px 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      white-space: nowrap;
    }

    .cursor-lead {
      left: 195px;
      top: 14px;
    }
    .cursor-lead svg {
      fill: #fafafa;
      color: #fafafa;
    }
    .cursor-lead .cursor-badge {
      background: #fafafa;
      color: #09090b;
      border-color: #fafafa;
    }

    .cursor-guest {
      right: 170px;
      bottom: 200px;
    }
    .cursor-guest svg {
      fill: #a1a1aa;
      color: #a1a1aa;
    }
    .cursor-guest .cursor-badge {
      background: #09090b;
      color: #fafafa;
      border-color: #3f3f46;
    }
  </style>
</head>
<body>
  <div class="viewport">
    
    <!-- Padrão Arquitetural de Pontos do Canvas -->
    <div class="dot-pattern"></div>

    <!-- Marcações de Canto de Blueprint -->
    <div class="corner-mark corner-tl"></div>
    <div class="corner-mark corner-tr"></div>
    <div class="corner-mark corner-bl"></div>
    <div class="corner-mark corner-br"></div>

    <!-- LADO ESQUERDO: Apresentação do Produto -->
    <div class="left-section">
      
      <div class="brand-group">
        <div class="kicker-row">
          <div class="pill-kicker">
            <span class="kicker-dot"></span>
            <span>Whiteboard Colaborativo</span>
          </div>
          <div class="status-badge">
            <span>Canvas Infinito</span>
          </div>
        </div>

        <div class="logo-wrap">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Mirio" class="brand-logo" />` : `<span style="font-weight:800; font-size:26px;">Mirio</span>`}
        </div>

        <div class="headline-wrap">
          <h1 class="hero-title">
            Ideias visuais em tempo real.
          </h1>

          <p class="hero-desc">
            Canvas infinito, retrospectivas de sprint e fluxogramas sincronizados a 60fps com cursores ao vivo para equipes de produto e design.
          </p>
        </div>
      </div>

      <!-- Métricas de Infraestrutura no Rodapé -->
      <div class="metrics-grid">
        <div class="metric-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <div class="metric-content">
            <span class="metric-val">60 FPS</span>
            <span class="metric-label">Render Konva</span>
          </div>
        </div>

        <div class="metric-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <div class="metric-content">
            <span class="metric-val">&lt; 30ms</span>
            <span class="metric-label">Tempo Real</span>
          </div>
        </div>

        <div class="metric-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <div class="metric-content">
            <span class="metric-val">Multiplayer</span>
            <span class="metric-label">Cursores ao Vivo</span>
          </div>
        </div>
      </div>

    </div>

    <!-- LADO DIREITO: Vitrine Flutuante do Canvas (Product Showcase) -->
    <div class="right-section">
      <div class="canvas-window">
        
        <!-- Header da Janela do Canvas -->
        <div class="canvas-header">
          <div class="window-dots">
            <div class="window-dot"></div>
            <div class="window-dot"></div>
            <div class="window-dot"></div>
          </div>

          <!-- Toolbar Minimalista Central -->
          <div class="stage-toolbar">
            <div class="stage-tool-btn active">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
              </svg>
            </div>
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/>
              </svg>
            </div>
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
              </svg>
            </div>
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              </svg>
            </div>
          </div>

          <!-- Presença Online -->
          <div class="presence-wrap">
            <div class="avatar-stack">
              <div class="avatar avatar-lead">AL</div>
              <div class="avatar">AN</div>
              <div class="avatar">LU</div>
            </div>
            <span class="presence-count">+4 online</span>
          </div>
        </div>

        <!-- Superfície do Canvas -->
        <div class="canvas-stage">
          
          <!-- Linha Conectora SVG Tracejada -->
          <svg class="connector-svg" viewBox="0 0 580 440" fill="none">
            <path d="M 263 125 C 340 125, 330 250, 390 280" 
                  stroke="rgba(161, 161, 170, 0.4)" 
                  stroke-width="1.5" 
                  stroke-dasharray="3 3"/>
            <polygon points="394,280 384,274 386,284" fill="#a1a1aa" />
          </svg>

          <!-- CARD 1: SPRINT_PLAN -->
          <div class="card-sprint">
            <div class="sprint-head">
              <span class="sprint-title">01 // SPRINT_PLAN</span>
              <span class="sprint-tag">ana.ux</span>
            </div>
            <div class="sprint-items">
              <div class="sprint-item-done">
                <span>[x]</span>
                <span>Canvas infinito GPU</span>
              </div>
              <div class="sprint-item-done">
                <span>[x]</span>
                <span>Cursores ao vivo RTDB</span>
              </div>
              <div class="sprint-item-pending">
                <span>[ ]</span>
                <span>Exportação vetorial</span>
              </div>
            </div>
            <div class="sprint-foot">
              <span>STATUS: ATIVO</span>
              <span class="sprint-foot-bold">60 FPS</span>
            </div>
          </div>

          <!-- CARD 2: ARCH_DECISION -->
          <div class="card-arch">
            <div class="arch-head">
              <span class="arch-title">02 // ARCH_DECISION</span>
              <span class="arch-tag">lucas.dev</span>
            </div>
            <p class="arch-text">
              Firestore para estado persistente + Realtime Database para presença instantânea.
            </p>
            <div class="arch-foot">
              <span>LATÊNCIA: &lt; 30MS</span>
              <span class="arch-dot"></span>
            </div>
          </div>

          <!-- CURSOR 1: Alexander (Lead) -->
          <div class="cursor-wrap cursor-lead">
            <svg viewBox="0 0 24 24">
              <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
            </svg>
            <span class="cursor-badge">alexander (lead)</span>
          </div>

          <!-- CURSOR 2: Convidado -->
          <div class="cursor-wrap cursor-guest">
            <svg viewBox="0 0 24 24">
              <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
            </svg>
            <span class="cursor-badge">ana.ux</span>
          </div>

        </div>

      </div>
    </div>

  </div>
</body>
</html>
`;

// 3. Salvar HTML em public/og-template.html
const templatePath = path.join(projectRoot, 'public', 'og-template.html');
fs.writeFileSync(templatePath, htmlContent, 'utf8');
console.log(`[1/3] Template HTML gerado em: ${templatePath}`);

// 4. Executar Microsoft Edge headless para tirar o screenshot de 1200x630
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outputPath = path.join(projectRoot, 'public', 'og.png');

console.log('[2/3] Capturando screenshot de 1200x630 via Headless Edge...');

const fileUrl = `file:///${templatePath.replace(/\\/g, '/')}`;
const edgeCmd = `"${edgePath}" --headless --disable-gpu --screenshot="${outputPath}" --window-size=1200,630 --hide-scrollbars --virtual-time-budget=1000 "${fileUrl}"`;

try {
  execSync(edgeCmd, { stdio: 'pipe' });
  console.log(`[3/3] Sucesso! Banner og.png gerado em: ${outputPath}`);

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`Tamanho do arquivo: ${(stats.size / 1024).toFixed(1)} KB`);
  }
} catch (err) {
  console.error('Erro ao renderizar com Edge:', err.message);
  process.exit(1);
}

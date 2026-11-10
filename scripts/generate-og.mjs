import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Carregar logos oficiais em base64 (Dark e Light)
const logoDarkPath = path.join(projectRoot, 'public', 'logo-full-dark.png');
const logoLightPath = path.join(projectRoot, 'public', 'logo-full-light.png');

const logoDarkBase64 = fs.existsSync(logoDarkPath)
  ? `data:image/png;base64,${fs.readFileSync(logoDarkPath).toString('base64')}`
  : '';

const logoLightBase64 = fs.existsSync(logoLightPath)
  ? `data:image/png;base64,${fs.readFileSync(logoLightPath).toString('base64')}`
  : '';

// 2. Função Geradora de Template HTML (Tema Escuro e Tema Claro)
function generateOgHtml(theme = 'dark') {
  const isDark = theme === 'dark';
  const logoBase64 = isDark ? logoDarkBase64 : logoLightBase64;

  // Paleta de cores para Dark e Light
  const colors = isDark ? {
    bg: '#09090b',
    border: '#27272a',
    dotColor: '#27272a',
    glowRight: 'rgba(99, 102, 241, 0.09)',
    glowLeft: 'rgba(16, 185, 129, 0.06)',
    cornerMarks: '#a1a1aa',
    textPrimary: '#fafafa',
    textSecondary: '#a1a1aa',
    kickerBg: 'rgba(24, 24, 27, 0.85)',
    kickerBorder: '#27272a',
    kickerText: '#fafafa',
    statusBadgeBg: 'rgba(24, 24, 27, 0.5)',
    statusBadgeBorder: '#27272a',
    statusBadgeText: '#a1a1aa',
    metricCardBg: 'rgba(18, 18, 23, 0.7)',
    metricCardBorder: '#27272a',
    metricCardShadow: 'none',
    metricCardSvg: '#fafafa',
    metricVal: '#fafafa',
    metricLabel: '#a1a1aa',
    windowBorder: '#27272a',
    windowBg: 'rgba(14, 14, 18, 0.92)',
    windowShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    windowHeaderBg: 'rgba(24, 24, 27, 0.75)',
    windowHeaderBorder: 'rgba(39, 39, 42, 0.7)',
    toolbarBg: '#09090b',
    toolbarBorder: '#27272a',
    toolbarBtnActiveBg: '#fafafa',
    toolbarBtnActiveColor: '#09090b',
    toolbarBtnColor: '#a1a1aa',
    toolbarDivider: '#27272a',
    avatarBorder: '#09090b',
    presenceText: '#a1a1aa',
    stageBg: 'transparent',
    stageDot: '#27272a',
    frameBorder: 'rgba(63, 63, 70, 0.65)',
    frameBg: 'rgba(24, 24, 27, 0.35)',
    frameHeaderBorder: 'rgba(39, 39, 42, 0.55)',
    frameTitle: '#fafafa',
    frameTagBg: 'rgba(39, 39, 42, 0.7)',
    frameTagBorder: '#3f3f46',
    frameTagText: '#d4d4d8',
    frameMeta: '#71717a',
    frameFooterBorder: 'rgba(39, 39, 42, 0.4)',
    frameFooterText: '#71717a',
    connectorStroke1: 'rgba(161, 161, 170, 0.55)',
    connectorStroke2: 'rgba(161, 161, 170, 0.45)',
    connectorArrow: '#a1a1aa',
    floatingPillBg: 'rgba(18, 18, 23, 0.95)',
    floatingPillBorder: '#3f3f46',
    floatingPillText: '#a1a1aa',
    stickyShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
    chatBubbleBg: '#18181b',
    chatBubbleBorder: '#3f3f46',
    chatBubbleText: '#fafafa',
    chatBubbleShadow: '0 6px 16px rgba(0, 0, 0, 0.6)',
    bottomBarBg: 'rgba(24, 24, 27, 0.75)',
    bottomBarBorder: 'rgba(39, 39, 42, 0.6)',
    bottomBarText: '#a1a1aa',
    zoomPillBg: '#09090b',
    zoomPillBorder: '#27272a',
    zoomPillText: '#fafafa'
  } : {
    bg: '#f8fafc',
    border: '#e2e8f0',
    dotColor: '#cbd5e1',
    glowRight: 'rgba(99, 102, 241, 0.08)',
    glowLeft: 'rgba(16, 185, 129, 0.07)',
    cornerMarks: '#94a3b8',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    kickerBg: '#ffffff',
    kickerBorder: '#e2e8f0',
    kickerText: '#0f172a',
    statusBadgeBg: '#f1f5f9',
    statusBadgeBorder: '#e2e8f0',
    statusBadgeText: '#64748b',
    metricCardBg: '#ffffff',
    metricCardBorder: '#e2e8f0',
    metricCardShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    metricCardSvg: '#0f172a',
    metricVal: '#0f172a',
    metricLabel: '#64748b',
    windowBorder: '#e2e8f0',
    windowBg: 'rgba(255, 255, 255, 0.95)',
    windowShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 1)',
    windowHeaderBg: 'rgba(248, 250, 252, 0.85)',
    windowHeaderBorder: '#e2e8f0',
    toolbarBg: '#ffffff',
    toolbarBorder: '#e2e8f0',
    toolbarBtnActiveBg: '#0f172a',
    toolbarBtnActiveColor: '#ffffff',
    toolbarBtnColor: '#64748b',
    toolbarDivider: '#e2e8f0',
    avatarBorder: '#ffffff',
    presenceText: '#64748b',
    stageBg: '#ffffff',
    stageDot: '#e2e8f0',
    frameBorder: 'rgba(203, 213, 225, 0.9)',
    frameBg: 'rgba(248, 250, 252, 0.65)',
    frameHeaderBorder: '#e2e8f0',
    frameTitle: '#0f172a',
    frameTagBg: '#ffffff',
    frameTagBorder: '#e2e8f0',
    frameTagText: '#475569',
    frameMeta: '#64748b',
    frameFooterBorder: '#e2e8f0',
    frameFooterText: '#64748b',
    connectorStroke1: 'rgba(148, 163, 184, 0.75)',
    connectorStroke2: 'rgba(148, 163, 184, 0.65)',
    connectorArrow: '#64748b',
    floatingPillBg: '#ffffff',
    floatingPillBorder: '#cbd5e1',
    floatingPillText: '#475569',
    stickyShadow: '0 10px 22px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
    chatBubbleBg: '#ffffff',
    chatBubbleBorder: '#e2e8f0',
    chatBubbleText: '#0f172a',
    chatBubbleShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
    bottomBarBg: 'rgba(248, 250, 252, 0.85)',
    bottomBarBorder: '#e2e8f0',
    bottomBarText: '#64748b',
    zoomPillBg: '#ffffff',
    zoomPillBorder: '#e2e8f0',
    zoomPillText: '#0f172a'
  };

  return `<!DOCTYPE html>
<html lang="pt-BR" class="${theme}">
<head>
  <meta charset="UTF-8" />
  <title>Mirio — Ideias visuais em tempo real (${theme === 'dark' ? 'Tema Escuro' : 'Tema Claro'})</title>
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
      background: ${colors.bg};
      color: ${colors.textPrimary};
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Container Principal 1200x630 */
    .viewport {
      position: relative;
      width: 1200px;
      height: 630px;
      display: flex;
      padding: 38px 46px;
      gap: 36px;
      background: ${colors.bg};
      border: 1px solid ${colors.border};
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    /* Padrão Arquitetural de Pontos do Canvas */
    .dot-pattern {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(${colors.dotColor} 1.2px, transparent 1.2px);
      background-size: 22px 22px;
      opacity: 0.85;
      pointer-events: none;
    }

    /* Luz de Fundo Sutil / Atmosfera Dark/Light */
    .bg-glow-right {
      position: absolute;
      top: -80px;
      right: -80px;
      width: 580px;
      height: 580px;
      background: radial-gradient(circle, ${colors.glowRight} 0%, transparent 65%);
      pointer-events: none;
    }

    .bg-glow-left {
      position: absolute;
      bottom: -120px;
      left: -80px;
      width: 480px;
      height: 480px;
      background: radial-gradient(circle, ${colors.glowLeft} 0%, transparent 65%);
      pointer-events: none;
    }

    /* Marcações de Esquadro Arquitetural nos Cantos */
    .corner-mark {
      position: absolute;
      width: 14px;
      height: 14px;
      pointer-events: none;
      opacity: 0.45;
    }
    .corner-tl { top: 14px; left: 14px; border-top: 1.5px solid ${colors.cornerMarks}; border-left: 1.5px solid ${colors.cornerMarks}; }
    .corner-tr { top: 14px; right: 14px; border-top: 1.5px solid ${colors.cornerMarks}; border-right: 1.5px solid ${colors.cornerMarks}; }
    .corner-bl { bottom: 14px; left: 14px; border-bottom: 1.5px solid ${colors.cornerMarks}; border-left: 1.5px solid ${colors.cornerMarks}; }
    .corner-br { bottom: 14px; right: 14px; border-bottom: 1.5px solid ${colors.cornerMarks}; border-right: 1.5px solid ${colors.cornerMarks}; }

    /* LADO ESQUERDO: Apresentação do Produto & Redesign Copywriting (465px) */
    .left-section {
      position: relative;
      z-index: 10;
      width: 465px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .brand-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Kicker e Tag do Topo */
    .kicker-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pill-kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid ${colors.kickerBorder};
      background: ${colors.kickerBg};
      border-radius: 6px;
      padding: 4px 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${colors.kickerText};
    }
    .kicker-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid ${colors.statusBadgeBorder};
      border-radius: 6px;
      padding: 4px 9px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      color: ${colors.statusBadgeText};
      background: ${colors.statusBadgeBg};
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

    /* Headline Editorial alinhada ao redesign de Login */
    .headline-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    h1.hero-title {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.16;
      color: ${colors.textPrimary};
      font-feature-settings: "kern" 1;
    }
    p.hero-desc {
      font-size: 14px;
      line-height: 1.55;
      color: ${colors.textSecondary};
      max-width: 445px;
    }

    /* Rodapé com Destaques de Benefícios para o Usuário */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid ${colors.border};
    }
    .metric-card {
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 8px;
      border: 1px solid ${colors.metricCardBorder};
      background: ${colors.metricCardBg};
      padding: 8px 10px;
      box-shadow: ${colors.metricCardShadow};
    }
    .metric-card svg {
      width: 15px;
      height: 15px;
      color: ${colors.metricCardSvg};
      flex-shrink: 0;
    }
    .metric-content {
      display: flex;
      flex-direction: column;
    }
    .metric-val {
      font-size: 11.5px;
      font-weight: 700;
      color: ${colors.metricVal};
      letter-spacing: -0.01em;
    }
    .metric-label {
      font-size: 9px;
      color: ${colors.metricLabel};
    }

    /* LADO DIREITO: Vitrine Flutuante do Canvas (Product Showcase do Login) */
    .right-section {
      position: relative;
      z-index: 10;
      flex: 1;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Moldura da Janela do Canvas (LoginBoardShowcase Fiel) */
    .canvas-window {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 14px;
      border: 1px solid ${colors.windowBorder};
      background: ${colors.windowBg};
      backdrop-filter: blur(16px);
      box-shadow: ${colors.windowShadow};
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Barra Superior da Janela */
    .canvas-header {
      height: 42px;
      padding: 0 16px;
      border-bottom: 1px solid ${colors.windowHeaderBorder};
      background: ${colors.windowHeaderBg};
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
    }
    .dot-red { background: #ef4444; opacity: 0.85; }
    .dot-yellow { background: #f59e0b; opacity: 0.85; }
    .dot-green { background: #10b981; opacity: 0.85; }

    /* Toolbar Minimalista Central (igual a LoginBoardShowcase.tsx) */
    .stage-toolbar {
      display: flex;
      align-items: center;
      gap: 3px;
      border-radius: 8px;
      border: 1px solid ${colors.toolbarBorder};
      background: ${colors.toolbarBg};
      padding: 2.5px 5px;
    }
    .stage-tool-btn {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${colors.toolbarBtnColor};
    }
    .stage-tool-btn.active {
      background: ${colors.toolbarBtnActiveBg};
      color: ${colors.toolbarBtnActiveColor};
    }
    .stage-tool-divider {
      width: 1px;
      height: 13px;
      background: ${colors.toolbarDivider};
      margin: 0 2px;
    }

    /* Avatares de Presença Online */
    .presence-wrap {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .avatar-stack {
      display: flex;
      align-items: center;
    }
    .avatar {
      width: 21px;
      height: 21px;
      border-radius: 50%;
      border: 1.5px solid ${colors.avatarBorder};
      margin-left: -5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      font-weight: 700;
      color: #ffffff;
    }
    .avatar:first-child { margin-left: 0; }
    .avatar-sofia { background: #6366f1; }
    .avatar-lucas { background: #10b981; }
    .avatar-camila { background: #f43f5e; }
    .avatar-voce { background: #2563eb; }
    .presence-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: ${colors.presenceText};
    }

    /* Superfície da Lousa (Canvas Infinito com Grid) */
    .canvas-stage {
      position: relative;
      flex: 1;
      width: 100%;
      background: ${colors.stageBg};
      background-image: radial-gradient(${colors.stageDot} 1.1px, transparent 1.1px);
      background-size: 20px 20px;
      overflow: hidden;
    }

    /* FRAME DE QUADRO: "✦ Sprint Retrospectiva & Ideação" (igual a LoginBoardShowcase) */
    .board-frame {
      position: absolute;
      inset: 10px 12px;
      border-radius: 12px;
      border: 1.5px dashed ${colors.frameBorder};
      background: ${colors.frameBg};
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 9px 13px;
    }
    .frame-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid ${colors.frameHeaderBorder};
      padding-bottom: 6px;
    }
    .frame-title-group {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .frame-title {
      font-size: 11px;
      font-weight: 700;
      color: ${colors.frameTitle};
      letter-spacing: -0.01em;
    }
    .frame-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5px;
      padding: 1.5px 5px;
      border-radius: 3px;
      background: ${colors.frameTagBg};
      border: 1px solid ${colors.frameTagBorder};
      color: ${colors.frameTagText};
    }
    .frame-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      color: ${colors.frameMeta};
    }
    .frame-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid ${colors.frameFooterBorder};
      padding-top: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: ${colors.frameFooterText};
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

    /* Tag Flutuante na Linha Conectora */
    .floating-connector-pill {
      position: absolute;
      left: 275px;
      top: 66px;
      z-index: 15;
      transform: translate(-50%, -50%);
      border-radius: 9999px;
      border: 1px solid ${colors.floatingPillBorder};
      background: ${colors.floatingPillBg};
      padding: 2.5px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: ${colors.floatingPillText};
      box-shadow: 0 4px 10px rgba(0, 0, 0, ${isDark ? '0.5' : '0.08'});
    }

    /* POST-IT 1: Amarelo Mirio (#fff9b1) — Ideação */
    .sticky-yellow {
      position: absolute;
      left: 20px;
      top: 48px;
      width: 205px;
      padding: 11px 13px;
      border-radius: 11px;
      background: #fff9b1;
      color: #713f12;
      border: 1px solid rgba(245, 158, 11, 0.5);
      box-shadow: ${colors.stickyShadow};
      transform: rotate(-1.5deg);
      z-index: 12;
    }

    /* POST-IT 2: Verde Menta Mirio (#dcfce7) — Decisão (Com seleção marquee de Lucas) */
    .sticky-mint {
      position: absolute;
      right: 32px;
      top: 44px;
      width: 215px;
      padding: 11px 13px;
      border-radius: 11px;
      background: #dcfce7;
      color: #14532d;
      border: 1px solid rgba(16, 185, 129, 0.5);
      box-shadow: ${colors.stickyShadow};
      transform: rotate(1.8deg);
      z-index: 12;
    }

    /* Marquee de Seleção Ativa do Lucas */
    .selection-marquee {
      position: absolute;
      inset: -5px;
      border-radius: 14px;
      border: 2px solid #10b981;
      pointer-events: none;
    }
    .selection-handle {
      position: absolute;
      width: 7px;
      height: 7px;
      background: #10b981;
      border: 1.5px solid #ffffff;
      border-radius: 2px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
    .handle-tl { top: -4.5px; left: -4.5px; }
    .handle-tr { top: -4.5px; right: -4.5px; }
    .handle-bl { bottom: -4.5px; left: -4.5px; }
    .handle-br { bottom: -4.5px; right: -4.5px; }

    /* POST-IT 3: Azul Glacial Mirio (#e0f2fe) — Votação */
    .sticky-blue {
      position: absolute;
      left: 165px;
      bottom: 38px;
      width: 220px;
      padding: 11px 13px;
      border-radius: 11px;
      background: #e0f2fe;
      color: #0c4a6e;
      border: 1px solid rgba(14, 165, 233, 0.5);
      box-shadow: ${colors.stickyShadow};
      transform: rotate(-0.6deg);
      z-index: 12;
    }

    /* Estilos Compartilhados dos Post-its */
    .sticky-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      font-size: 9.5px;
      font-weight: 700;
    }
    .sticky-pill {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .sticky-dot-yellow { width: 6px; height: 6px; border-radius: 50%; background: #d97706; }
    .sticky-dot-mint { width: 6px; height: 6px; border-radius: 50%; background: #059669; }
    .sticky-dot-blue { width: 6px; height: 6px; border-radius: 50%; background: #0284c7; }
    
    .sticky-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      opacity: 0.75;
    }
    .sticky-text {
      padding: 7px 0;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.45;
    }
    .sticky-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 5px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      font-size: 9px;
      font-weight: 600;
    }
    .sticky-reactions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .reaction-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 5.5px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      font-size: 8.5px;
      font-weight: 700;
      color: #18181b;
    }

    /* CURSORES COLABORATIVOS COM BALÕES DE CHAT */
    .cursor-entity {
      position: absolute;
      z-index: 25;
      pointer-events: none;
    }
    .cursor-pointer-wrap {
      position: relative;
      display: inline-block;
    }
    .cursor-svg {
      width: 22px;
      height: 22px;
      filter: drop-shadow(0 2px 5px rgba(0, 0, 0, ${isDark ? '0.5' : '0.25'}));
    }
    .cursor-badge-pill {
      position: absolute;
      left: 14px;
      top: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    
    /* Balões de Chat Estilo Figma / Mirio */
    .chat-bubble-sofia {
      position: absolute;
      top: 26px;
      left: -65px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: ${colors.chatBubbleBg};
      color: ${colors.chatBubbleText};
      padding: 4px 9px;
      border-radius: 9px;
      border: 1px solid ${colors.chatBubbleBorder};
      font-size: 9.5px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: ${colors.chatBubbleShadow};
    }
    .chat-bubble-sofia::after {
      content: '';
      position: absolute;
      top: -4px;
      right: 25px;
      width: 6px;
      height: 6px;
      background: ${colors.chatBubbleBg};
      border-top: 1px solid ${colors.chatBubbleBorder};
      border-left: 1px solid ${colors.chatBubbleBorder};
      transform: rotate(45deg);
    }

    .chat-bubble-lucas {
      position: absolute;
      top: 26px;
      right: 0px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: ${colors.chatBubbleBg};
      color: ${colors.chatBubbleText};
      padding: 4px 9px;
      border-radius: 9px;
      border: 1px solid ${colors.chatBubbleBorder};
      font-size: 9.5px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: ${colors.chatBubbleShadow};
    }
    .chat-bubble-lucas::after {
      content: '';
      position: absolute;
      top: -4px;
      right: 25px;
      width: 6px;
      height: 6px;
      background: ${colors.chatBubbleBg};
      border-top: 1px solid ${colors.chatBubbleBorder};
      border-left: 1px solid ${colors.chatBubbleBorder};
      transform: rotate(45deg);
    }

    .chat-bubble-camila {
      position: absolute;
      bottom: 24px;
      left: -15px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: ${colors.chatBubbleBg};
      color: ${colors.chatBubbleText};
      padding: 4px 9px;
      border-radius: 9px;
      border: 1px solid ${colors.chatBubbleBorder};
      font-size: 9.5px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: ${colors.chatBubbleShadow};
    }
    .chat-bubble-camila::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 16px;
      width: 6px;
      height: 6px;
      background: ${colors.chatBubbleBg};
      border-right: 1px solid ${colors.chatBubbleBorder};
      border-bottom: 1px solid ${colors.chatBubbleBorder};
      transform: rotate(45deg);
    }

    /* Posições dos Cursores */
    .cursor-sofia {
      left: 185px;
      top: 168px;
    }
    .cursor-lucas {
      right: 55px;
      top: 195px;
    }
    .cursor-camila {
      left: 395px;
      bottom: 52px;
    }
    .cursor-voce {
      left: 45px;
      bottom: 45px;
    }

    /* Rodapé da Janela do Canvas */
    .canvas-bottom-bar {
      height: 36px;
      padding: 0 16px;
      border-top: 1px solid ${colors.bottomBarBorder};
      background: ${colors.bottomBarBg};
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: ${colors.bottomBarText};
    }
    .zoom-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 6px;
      border: 1px solid ${colors.zoomPillBorder};
      background: ${colors.zoomPillBg};
      padding: 3px 8px;
      font-weight: 600;
      color: ${colors.zoomPillText};
    }
  </style>
</head>
<body>
  <div class="viewport">
    
    <!-- Padrão Arquitetural de Pontos do Canvas -->
    <div class="dot-pattern"></div>
    <div class="bg-glow-right"></div>
    <div class="bg-glow-left"></div>

    <!-- Marcações de Canto de Blueprint -->
    <div class="corner-mark corner-tl"></div>
    <div class="corner-mark corner-tr"></div>
    <div class="corner-mark corner-bl"></div>
    <div class="corner-mark corner-br"></div>

    <!-- LADO ESQUERDO: Apresentação do Produto & Redesign Copy -->
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
          ${logoBase64 ? `<img src="${logoBase64}" alt="Mirio" class="brand-logo" />` : `<span style="font-weight:800; font-size:30px;">Mirio</span>`}
        </div>

        <div class="headline-wrap">
          <h1 class="hero-title"><span style="letter-spacing: -0.06em; margin-right: 0.1em;">Pense,</span> desenhe e crie<br/>em tempo real com seu time.</h1>

          <p class="hero-desc">
            O whiteboard colaborativo onde ideias ganham forma. Organize dinâmicas, crie post-its, estruture fluxos e colabore com cursores ao vivo.
          </p>
        </div>
      </div>

      <!-- Destaques de Benefícios para Equipes e Usuários -->
      <div class="metrics-grid">
        <div class="metric-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/>
            <path d="M15 3v6h6"/>
          </svg>
          <div class="metric-content">
            <span class="metric-val">Post-its & Ideias</span>
            <span class="metric-label">Dinâmicas e sprints</span>
          </div>
        </div>

        <div class="metric-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <div class="metric-content">
            <span class="metric-val">Ao Vivo no Board</span>
            <span class="metric-label">Trabalho em equipe</span>
          </div>
        </div>

        <div class="metric-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <div class="metric-content">
            <span class="metric-val">100% Gratuito</span>
            <span class="metric-label">Direto no navegador</span>
          </div>
        </div>
      </div>

    </div>

    <!-- LADO DIREITO: Vitrine Flutuante do Canvas (Product Showcase do Login) -->
    <div class="right-section">
      <div class="canvas-window">
        
        <!-- Header da Janela do Canvas -->
        <div class="canvas-header">
          <div class="window-dots">
            <div class="window-dot dot-red"></div>
            <div class="window-dot dot-yellow"></div>
            <div class="window-dot dot-green"></div>
          </div>

          <!-- Mini Toolbar Real Central (Select, Hand, Sticky, Shape, Pen, Text, Arrow, Reaction) -->
          <div class="stage-toolbar">
            <!-- Select (Ativo) -->
            <div class="stage-tool-btn active">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 3l15 15h-6.5l-3.5 6-2-1 3.5-6H4.5L4.5 3z" />
              </svg>
            </div>
            <!-- Hand -->
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8M10 14a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div class="stage-tool-divider"></div>
            <!-- Sticky Note com Ponto Âmbar -->
            <div class="stage-tool-btn" style="position: relative; color: #fbbf24;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/>
              </svg>
              <span style="position: absolute; bottom: 2px; right: 2px; width: 4px; height: 4px; border-radius: 50%; background: #f59e0b;"></span>
            </div>
            <!-- Shape -->
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
            </div>
            <!-- Pen -->
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              </svg>
            </div>
            <!-- Text -->
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
              </svg>
            </div>
            <!-- Arrow -->
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
              </svg>
            </div>
            <!-- Reaction -->
            <div class="stage-tool-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
          </div>

          <!-- Presença Online com Avatares reais do Mirio -->
          <div class="presence-wrap">
            <div class="avatar-stack">
              <div class="avatar avatar-sofia" title="Sofia M.">S</div>
              <div class="avatar avatar-lucas" title="Lucas R.">L</div>
              <div class="avatar avatar-camila" title="Camila P.">C</div>
              <div class="avatar avatar-voce" title="Você">V</div>
            </div>
            <span class="presence-count">4 no canvas</span>
          </div>
        </div>

        <!-- Superfície do Canvas Infinito -->
        <div class="canvas-stage">
          
          <!-- FRAME DE QUADRO: Sprint Retrospectiva & Ideação -->
          <div class="board-frame">
            <div class="frame-header">
              <div class="frame-title-group">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${colors.frameMeta}" stroke-width="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
                <span class="frame-title">Frame: Sprint Retrospectiva & Ideação</span>
                <span class="frame-tag">#sprint-14</span>
              </div>
              <span class="frame-meta">3 membros ativos</span>
            </div>

            <div class="frame-footer">
              <span>3 notas organizadas • 2 conexões</span>
              <span>Visualização do time</span>
            </div>
          </div>

          <!-- Linhas Conectoras SVG Tracejadas -->
          <svg class="connector-svg" viewBox="0 0 580 440" fill="none">
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="${colors.connectorArrow}" />
              </marker>
            </defs>
            <!-- Conexão Nota 1 -> Nota 2 -->
            <path d="M 225 105 C 265 80, 295 110, 335 85" 
                  stroke="${colors.connectorStroke1}" 
                  stroke-width="1.8" 
                  stroke-dasharray="4 4"
                  marker-end="url(#arrowhead)"/>
            
            <!-- Conexão Nota 2 -> Nota 3 -->
            <path d="M 405 180 C 385 230, 350 215, 315 245" 
                  stroke="${colors.connectorStroke2}" 
                  stroke-width="1.8" 
                  stroke-dasharray="4 4"
                  marker-end="url(#arrowhead)"/>
          </svg>

          <!-- Tag Flutuante na Linha Conectora -->
          <div class="floating-connector-pill">
            próximo passo ➔
          </div>

          <!-- ==========================================
               POST-IT 1: Amarelo Mirio (#fff9b1)
               ========================================== -->
          <div class="sticky-yellow">
            <div class="sticky-header">
              <span class="sticky-pill">
                <span class="sticky-dot-yellow"></span>
                <span>Ideação</span>
              </span>
              <span class="sticky-tag">#onboarding</span>
            </div>
            <p class="sticky-text">
              Mapear fluxo de onboarding e convite em 1 clique para novos membros.
            </p>
            <div class="sticky-footer">
              <span>Sofia M.</span>
              <div class="sticky-reactions">
                <span class="reaction-badge">❤️ 4</span>
                <span class="reaction-badge">👍 3</span>
              </div>
            </div>
          </div>

          <!-- ==========================================
               POST-IT 2: Verde Menta Mirio (#dcfce7)
               Com seleção marquee e handles do Lucas
               ========================================== -->
          <div class="sticky-mint">
            <!-- Marquee de Seleção Ativa -->
            <div class="selection-marquee">
              <span class="selection-handle handle-tl"></span>
              <span class="selection-handle handle-tr"></span>
              <span class="selection-handle handle-bl"></span>
              <span class="selection-handle handle-br"></span>
            </div>

            <div class="sticky-header">
              <span class="sticky-pill">
                <span class="sticky-dot-mint"></span>
                <span>Decisão</span>
              </span>
              <span class="sticky-tag">#apresentação</span>
            </div>
            <p class="sticky-text">
              Modo Apresentação interativo e exportação em alta qualidade (PNG e SVG).
            </p>
            <div class="sticky-footer">
              <span>Lucas R.</span>
              <div class="sticky-reactions">
                <span class="reaction-badge">🚀 5</span>
                <span class="reaction-badge">🔥 2</span>
              </div>
            </div>
          </div>

          <!-- ==========================================
               POST-IT 3: Azul Glacial Mirio (#e0f2fe)
               ========================================== -->
          <div class="sticky-blue">
            <div class="sticky-header">
              <span class="sticky-pill">
                <span class="sticky-dot-blue"></span>
                <span>Votação</span>
              </span>
              <span class="sticky-tag">#sprint-prep</span>
            </div>
            <p class="sticky-text">
              Votação silenciosa: dinâmica ágil com timer para priorizar ideias do time.
            </p>
            <div class="sticky-footer">
              <span>Camila P.</span>
              <div class="sticky-reactions">
                <span class="reaction-badge">💡 6</span>
              </div>
            </div>
          </div>

          <!-- ==========================================
               CURSORES COLABORATIVOS COM BALÕES DE CHAT
               ========================================== -->

          <!-- Cursor Sofia (Índigo #6366f1) -->
          <div class="cursor-entity cursor-sofia">
            <div class="cursor-pointer-wrap">
              <svg class="cursor-svg" viewBox="0 0 24 24" fill="none">
                <path d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                      fill="#6366f1" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="cursor-badge-pill" style="background: #6366f1;">
                <span>Sofia M.</span>
              </div>
              <div class="chat-bubble-sofia">
                <span>Organizando cards da sprint</span>
                <span>📌</span>
              </div>
            </div>
          </div>

          <!-- Cursor Lucas (Esmeralda #10b981) -->
          <div class="cursor-entity cursor-lucas">
            <div class="cursor-pointer-wrap">
              <svg class="cursor-svg" viewBox="0 0 24 24" fill="none">
                <path d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                      fill="#10b981" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="cursor-badge-pill" style="background: #10b981;">
                <span>Lucas R.</span>
              </div>
              <div class="chat-bubble-lucas">
                <span>Aprovado para a Sprint 14!</span>
                <span>🚀</span>
              </div>
            </div>
          </div>

          <!-- Cursor Camila (Rosa #f43f5e) -->
          <div class="cursor-entity cursor-camila">
            <div class="cursor-pointer-wrap">
              <svg class="cursor-svg" viewBox="0 0 24 24" fill="none">
                <path d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                      fill="#f43f5e" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="cursor-badge-pill" style="background: #f43f5e;">
                <span>Camila P.</span>
              </div>
              <div class="chat-bubble-camila">
                <span>Votação aberta no board</span>
                <span>✨</span>
              </div>
            </div>
          </div>

          <!-- Cursor Você (Azul #2563eb) -->
          <div class="cursor-entity cursor-voce">
            <div class="cursor-pointer-wrap">
              <svg class="cursor-svg" viewBox="0 0 24 24" fill="none">
                <path d="M 1.50 5.00 Q 1.50 1.50 4.35 3.53 L 13.47 10.05 Q 15.50 11.50 13.00 11.50 L 11.00 11.50 Q 8.50 11.50 6.73 13.27 L 3.27 16.73 Q 1.50 18.50 1.50 16.00 Z"
                      fill="#2563eb" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="cursor-badge-pill" style="background: #2563eb;">
                <span style="width: 4px; height: 4px; border-radius: 50%; background: #ffffff;"></span>
                <span>Você</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Rodapé da Janela do Canvas -->
        <div class="canvas-bottom-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="zoom-pill">
              <span style="opacity: 0.6;">−</span>
              <span>100%</span>
              <span style="opacity: 0.6;">+</span>
            </div>
            <span>Canvas Infinito</span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
            <span>Salvo automaticamente • Ao vivo</span>
          </div>
        </div>

      </div>
    </div>

  </div>
</body>
</html>
`;
}

// 3. Salvar templates HTML para ambos os temas
const darkHtml = generateOgHtml('dark');
const lightHtml = generateOgHtml('light');

const darkTemplatePath = path.join(projectRoot, 'public', 'og-dark-template.html');
const lightTemplatePath = path.join(projectRoot, 'public', 'og-light-template.html');
const defaultTemplatePath = path.join(projectRoot, 'public', 'og-template.html');

fs.writeFileSync(darkTemplatePath, darkHtml, 'utf8');
fs.writeFileSync(lightTemplatePath, lightHtml, 'utf8');
fs.writeFileSync(defaultTemplatePath, darkHtml, 'utf8');

console.log('[1/4] Templates HTML gerados:');
console.log(`  - Escuro: ${darkTemplatePath}`);
console.log(`  - Claro:  ${lightTemplatePath}`);

// 4. Executar Microsoft Edge headless para tirar screenshots de 1200x630
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const darkOutputPath = path.join(projectRoot, 'public', 'og-dark.png');
const lightOutputPath = path.join(projectRoot, 'public', 'og-light.png');
const defaultOutputPath = path.join(projectRoot, 'public', 'og.png');

console.log('[2/4] Capturando og-dark.png (1200x630)...');
const darkFileUrl = `file:///${darkTemplatePath.replace(/\\/g, '/')}`;
const darkCmd = `"${edgePath}" --headless --disable-gpu --screenshot="${darkOutputPath}" --window-size=1200,630 --hide-scrollbars --virtual-time-budget=2000 "${darkFileUrl}"`;

try {
  execSync(darkCmd, { stdio: 'pipe' });
  console.log(`  ✓ og-dark.png gerado: ${(fs.statSync(darkOutputPath).size / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error('Erro ao renderizar og-dark.png:', err.message);
  process.exit(1);
}

console.log('[3/4] Capturando og-light.png (1200x630)...');
const lightFileUrl = `file:///${lightTemplatePath.replace(/\\/g, '/')}`;
const lightCmd = `"${edgePath}" --headless --disable-gpu --screenshot="${lightOutputPath}" --window-size=1200,630 --hide-scrollbars --virtual-time-budget=2000 "${lightFileUrl}"`;

try {
  execSync(lightCmd, { stdio: 'pipe' });
  console.log(`  ✓ og-light.png gerado: ${(fs.statSync(lightOutputPath).size / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error('Erro ao renderizar og-light.png:', err.message);
  process.exit(1);
}

// 5. Copiar versão escura para og.png padrão (compatibilidade total e retroativa)
fs.copyFileSync(darkOutputPath, defaultOutputPath);
console.log(`[4/4] Sucesso! og.png padrão sincronizado.`);
console.log('Todos os banners OG (Dark & Light) foram gerados com sucesso!');

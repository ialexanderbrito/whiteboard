import type { RichEmbedProvider } from '../types/element.ts';
import { normalizeUrl } from './textLinks.ts';
import {
  CODE_LANGUAGE_ACCENT,
  CODE_LANGUAGE_TEMPLATES,
  CODE_TOKEN_COLORS_DARK,
  CODE_TOKEN_COLORS_LIGHT,
  getDefaultCodeSnippet as getTemplateForCanonicalLang,
  isUntouchedDefaultCodeSnippet,
  tokenizeCodeBlockLines,
  tokenizeSingleCodeLine,
  type CodeSyntaxToken,
  type CodeTokenKind,
} from './codeSyntaxHighlighter.ts';

export {
  CODE_LANGUAGE_ACCENT,
  CODE_LANGUAGE_TEMPLATES,
  CODE_TOKEN_COLORS_DARK,
  CODE_TOKEN_COLORS_LIGHT,
  isUntouchedDefaultCodeSnippet,
  type CodeSyntaxToken,
  type CodeTokenKind,
};

export interface ParsedRichLink {
  url: string;
  provider: RichEmbedProvider;
  providerLabel: string;
  accentColor: string;
  domain: string;
  title: string;
  description: string;
  thumbUrl?: string;
}

/**
 * Analisa uma URL colada no quadro e extrai metadados ricos (GitHub, Figma, YouTube, Jira, Linear, Notion, Google Docs ou Web)
 * para renderizar um Card de Link Rico (Unfurl) instantaneamente sem depender de scraping externo bloqueado por CORS.
 */
export function parseRichLinkMetadata(rawInput: string): ParsedRichLink | null {
  const trimmed = rawInput.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;

  const safeUrl = normalizeUrl(trimmed);
  if (!safeUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(safeUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const pathSegments = parsed.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s));

  // 1. YouTube (com miniatura oficial de alta definição)
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const videoId =
      host === 'youtu.be'
        ? pathSegments[0]
        : parsed.searchParams.get('v') ||
          (pathSegments[0] === 'shorts' || pathSegments[0] === 'embed' ? pathSegments[1] : null);
    const cleanId = videoId && /^[a-zA-Z0-9_-]{6,15}$/.test(videoId) ? videoId : null;
    return {
      url: safeUrl,
      provider: 'youtube',
      providerLabel: 'YouTube',
      accentColor: '#ef4444',
      domain: 'youtube.com',
      title: cleanId ? `Vídeo YouTube (${cleanId})` : 'Vídeo no YouTube',
      description: parsed.pathname + parsed.search,
      ...(cleanId ? { thumbUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg` } : {}),
    };
  }

  // 2. GitHub (Repositório, Pull Request, Issue ou Commit)
  if (host === 'github.com') {
    const owner = pathSegments[0];
    const repo = pathSegments[1];
    const kind = pathSegments[2];
    const num = pathSegments[3];
    let title = owner && repo ? `${owner}/${repo}` : 'GitHub';
    let desc = 'Repositório de código no GitHub';
    if (kind === 'pull' && num) {
      title = `PR #${num} · ${owner}/${repo}`;
      desc = 'Pull Request no GitHub';
    } else if (kind === 'issues' && num) {
      title = `Issue #${num} · ${owner}/${repo}`;
      desc = 'Issue rastreada no GitHub';
    } else if (kind === 'blob' || kind === 'tree') {
      desc = pathSegments.slice(2).join('/');
    }
    return {
      url: safeUrl,
      provider: 'github',
      providerLabel: 'GitHub',
      accentColor: '#24292f',
      domain: 'github.com',
      title,
      description: desc,
    };
  }

  // 3. Figma / FigJam
  if (host.endsWith('figma.com')) {
    const fileType = pathSegments[0];
    const fileSlug = pathSegments[2] || pathSegments[1] || 'Arquivo de Design';
    const readableName = fileSlug.replace(/[-_]+/g, ' ');
    return {
      url: safeUrl,
      provider: 'figma',
      providerLabel: fileType === 'board' ? 'FigJam' : 'Figma',
      accentColor: '#a855f7',
      domain: 'figma.com',
      title: readableName,
      description: fileType === 'proto' ? 'Protótipo interativo Figma' : 'Design & especificação visual',
    };
  }

  // 4. Linear
  if (host.endsWith('linear.app')) {
    const issueKey = pathSegments.find((s) => /^[A-Z0-9]+-\d+$/i.test(s));
    const slug = pathSegments[pathSegments.length - 1]?.replace(/-/g, ' ') || 'Tarefa Linear';
    return {
      url: safeUrl,
      provider: 'linear',
      providerLabel: 'Linear',
      accentColor: '#5e6ad2',
      domain: 'linear.app',
      title: issueKey ? `${issueKey.toUpperCase()} — ${slug}` : slug,
      description: 'Planejamento & Issue no Linear',
    };
  }

  // 5. Jira / Atlassian
  if (host.includes('atlassian.net') || host.includes('jira')) {
    const issueKey =
      pathSegments[pathSegments.indexOf('browse') + 1] ||
      parsed.searchParams.get('selectedIssue') ||
      pathSegments[pathSegments.length - 1] ||
      'Tarefa Jira';
    return {
      url: safeUrl,
      provider: 'jira',
      providerLabel: 'Jira',
      accentColor: '#2563eb',
      domain: host,
      title: issueKey,
      description: 'Item de backlog / Sprint no Jira',
    };
  }

  // 6. Notion
  if (host.endsWith('notion.so') || host.endsWith('notion.site')) {
    const rawSlug = pathSegments[pathSegments.length - 1] || 'Página Notion';
    const cleanTitle = rawSlug.replace(/-[0-9a-f]{24,32}$/i, '').replace(/[-_]+/g, ' ');
    return {
      url: safeUrl,
      provider: 'notion',
      providerLabel: 'Notion',
      accentColor: '#0f172a',
      domain: host,
      title: cleanTitle || 'Documento no Notion',
      description: 'Wiki & documentação colaborativa',
    };
  }

  // 7. Google Docs / Sheets / Slides
  if (host === 'docs.google.com') {
    const docKind = pathSegments[0];
    const kindLabel =
      docKind === 'spreadsheets'
        ? 'Google Sheets'
        : docKind === 'presentation'
          ? 'Google Slides'
          : 'Google Docs';
    return {
      url: safeUrl,
      provider: 'docs',
      providerLabel: kindLabel,
      accentColor: '#0284c7',
      domain: 'docs.google.com',
      title: `Documento em ${kindLabel}`,
      description: parsed.pathname,
    };
  }

  // 8. Link Web Genérico
  const lastSeg = pathSegments[pathSegments.length - 1];
  const readableTitle = lastSeg
    ? lastSeg.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ')
    : host;

  return {
    url: safeUrl,
    provider: 'web',
    providerLabel: 'Link Web',
    accentColor: '#0ea5e9',
    domain: host,
    title: readableTitle.charAt(0).toUpperCase() + readableTitle.slice(1),
    description: parsed.pathname === '/' ? safeUrl : `${host}${parsed.pathname}`,
  };
}

export interface CodeLanguageOption {
  id: string;
  label: string;
  badge: string;
  aliases?: ReadonlyArray<string>;
}

export interface CodeLanguageGroup {
  label: string;
  items: ReadonlyArray<CodeLanguageOption>;
}

export const CODE_LANGUAGE_GROUPS: ReadonlyArray<CodeLanguageGroup> = [
  {
    label: 'Web & Frontend',
    items: [
      { id: 'typescript', label: 'TypeScript', badge: 'TYPESCRIPT', aliases: ['ts', 'mts', 'cts'] },
      { id: 'javascript', label: 'JavaScript', badge: 'JAVASCRIPT', aliases: ['js', 'mjs', 'cjs', 'node'] },
      { id: 'tsx', label: 'TSX / JSX', badge: 'TSX / JSX', aliases: ['jsx', 'react'] },
      { id: 'html', label: 'HTML', badge: 'HTML', aliases: ['htm'] },
      { id: 'css', label: 'CSS / SCSS', badge: 'CSS', aliases: ['scss', 'sass', 'less', 'tailwind'] },
    ],
  },
  {
    label: 'Backend & Sistemas',
    items: [
      { id: 'python', label: 'Python', badge: 'PYTHON', aliases: ['py'] },
      { id: 'java', label: 'Java', badge: 'JAVA', aliases: ['jvm', 'spring'] },
      { id: 'csharp', label: 'C#', badge: 'C#', aliases: ['cs', 'c#', 'dotnet', '.net'] },
      { id: 'cpp', label: 'C / C++', badge: 'C / C++', aliases: ['c', 'c++', 'cc', 'cxx', 'hpp'] },
      { id: 'go', label: 'Go', badge: 'GO', aliases: ['golang'] },
      { id: 'rust', label: 'Rust', badge: 'RUST', aliases: ['rs', 'cargo'] },
      { id: 'php', label: 'PHP', badge: 'PHP', aliases: ['laravel'] },
      { id: 'ruby', label: 'Ruby', badge: 'RUBY', aliases: ['rb', 'rails'] },
      { id: 'swift', label: 'Swift', badge: 'SWIFT', aliases: ['ios'] },
      { id: 'kotlin', label: 'Kotlin', badge: 'KOTLIN', aliases: ['kt', 'kts', 'android'] },
      { id: 'dart', label: 'Dart', badge: 'DART', aliases: ['flutter'] },
    ],
  },
  {
    label: 'Dados & APIs',
    items: [
      { id: 'sql', label: 'SQL', badge: 'SQL', aliases: ['postgres', 'psql', 'mysql', 'sqlite'] },
      { id: 'graphql', label: 'GraphQL', badge: 'GRAPHQL', aliases: ['gql'] },
      { id: 'json', label: 'JSON', badge: 'JSON', aliases: ['jsonc'] },
      { id: 'prisma', label: 'Prisma', badge: 'PRISMA', aliases: ['schema'] },
    ],
  },
  {
    label: 'DevOps, Config & Docs',
    items: [
      { id: 'bash', label: 'Bash / Shell', badge: 'BASH', aliases: ['sh', 'zsh', 'shell', 'cli', 'terminal'] },
      { id: 'powershell', label: 'PowerShell', badge: 'POWERSHELL', aliases: ['ps1', 'pwsh'] },
      { id: 'yaml', label: 'YAML', badge: 'YAML', aliases: ['yml'] },
      { id: 'xml', label: 'XML', badge: 'XML', aliases: ['svg'] },
      { id: 'dockerfile', label: 'Dockerfile', badge: 'DOCKERFILE', aliases: ['docker', 'container'] },
      { id: 'markdown', label: 'Markdown', badge: 'MARKDOWN', aliases: ['md', 'mdx'] },
      { id: 'plaintext', label: 'Texto Puro', badge: 'TEXT', aliases: ['txt', 'text', 'plain'] },
    ],
  },
];

export const CODE_LANGUAGES: ReadonlyArray<CodeLanguageOption> = CODE_LANGUAGE_GROUPS.flatMap(
  (group) => group.items
);

const CODE_LANGUAGE_MAP = new Map<string, CodeLanguageOption>(
  CODE_LANGUAGES.map((lang) => [lang.id, lang])
);

const CODE_LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'tsx',
  htm: 'html',
  svg: 'xml',
  scss: 'css',
  sass: 'css',
  less: 'css',
  py: 'python',
  cs: 'csharp',
  'c#': 'csharp',
  dotnet: 'csharp',
  c: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  golang: 'go',
  rs: 'rust',
  rb: 'ruby',
  kt: 'kotlin',
  kts: 'kotlin',
  psql: 'sql',
  postgres: 'sql',
  mysql: 'sql',
  sqlite: 'sql',
  gql: 'graphql',
  jsonc: 'json',
  sh: 'bash',
  zsh: 'bash',
  shell: 'bash',
  console: 'bash',
  ps1: 'powershell',
  pwsh: 'powershell',
  yml: 'yaml',
  docker: 'dockerfile',
  md: 'markdown',
  mdx: 'markdown',
  txt: 'plaintext',
  text: 'plaintext',
  plain: 'plaintext',
};

export function normalizeCodeLanguage(rawLanguage?: string): string {
  const cleaned = (rawLanguage || 'typescript').trim().toLowerCase();
  if (!cleaned) return 'typescript';
  if (CODE_LANGUAGE_MAP.has(cleaned)) return cleaned;
  return CODE_LANGUAGE_ALIASES[cleaned] || 'typescript';
}

export function getCodeLanguageLabel(rawLanguage?: string): string {
  const canonical = normalizeCodeLanguage(rawLanguage);
  return CODE_LANGUAGE_MAP.get(canonical)?.label || canonical.toUpperCase();
}

export function getCodeLanguageBadge(rawLanguage?: string): string {
  const cleaned = (rawLanguage || '').trim();
  const canonical = normalizeCodeLanguage(cleaned);
  const found = CODE_LANGUAGE_MAP.get(canonical);
  if (found) return found.badge;
  return cleaned ? cleaned.toUpperCase() : 'TYPESCRIPT';
}

export function getDefaultCodeSnippet(rawLanguage?: string): string {
  const canonical = normalizeCodeLanguage(rawLanguage);
  return getTemplateForCanonicalLang(canonical);
}

export function getCodeLanguageAccent(rawLanguage?: string): string {
  const canonical = normalizeCodeLanguage(rawLanguage);
  return CODE_LANGUAGE_ACCENT[canonical] || '#3178c6';
}

/**
 * Tokeniza múltiplas linhas preservando estado entre linhas (comentários de bloco /* ... *\/,
 * comentários HTML <!-- ... -->, docstrings Python """ ... """ e blocos cercados em Markdown).
 */
export function tokenizeCodeBlock(
  linesOrText: ReadonlyArray<string> | string,
  language = 'typescript'
): CodeSyntaxToken[][] {
  const lines = typeof linesOrText === 'string' ? linesOrText.split('\n') : linesOrText;
  const normalizedLang = normalizeCodeLanguage(language);
  return tokenizeCodeBlockLines(lines, normalizedLang, normalizeCodeLanguage);
}

/**
 * Tokeniza uma única linha com gramática real dedicada por linguagem (27 linguagens suportadas).
 */
export function tokenizeCodeLine(line: string, language = 'typescript'): CodeSyntaxToken[] {
  if (!line) return [{ text: '', kind: 'plain' }];
  const normalizedLang = normalizeCodeLanguage(language);
  return tokenizeSingleCodeLine(line, normalizedLang, normalizeCodeLanguage);
}

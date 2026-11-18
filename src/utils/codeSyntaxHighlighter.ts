export type CodeTokenKind =
  | 'plain'
  | 'keyword'
  | 'storage'
  | 'type'
  | 'function'
  | 'property'
  | 'string'
  | 'number'
  | 'constant'
  | 'tag'
  | 'decorator'
  | 'operator'
  | 'comment'
  | 'heading';

export interface CodeSyntaxToken {
  text: string;
  kind: CodeTokenKind;
}

export const CODE_TOKEN_COLORS_DARK: Record<CodeTokenKind, string> = {
  plain: '#e6edf3',
  keyword: '#ff7b72',
  storage: '#c084fc',
  type: '#2dd4bf',
  function: '#d2a8ff',
  property: '#79c0ff',
  string: '#86efac',
  number: '#ffa657',
  constant: '#f9a8d4',
  tag: '#fb7185',
  decorator: '#fcd34d',
  operator: '#94a3b8',
  comment: '#8b949e',
  heading: '#38bdf8',
};

export const CODE_TOKEN_COLORS_LIGHT: Record<CodeTokenKind, string> = {
  plain: '#1f2328',
  keyword: '#cf222e',
  storage: '#8250df',
  type: '#0f766e',
  function: '#6639ba',
  property: '#0550ae',
  string: '#116329',
  number: '#9a3412',
  constant: '#be185d',
  tag: '#be123c',
  decorator: '#a16207',
  operator: '#57606a',
  comment: '#6e7781',
  heading: '#0284c7',
};

export const CODE_LANGUAGE_ACCENT: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#facc15',
  tsx: '#38bdf8',
  html: '#f97316',
  css: '#a855f7',
  python: '#3b82f6',
  java: '#ef4444',
  csharp: '#8b5cf6',
  cpp: '#06b6d4',
  go: '#00add8',
  rust: '#fb923c',
  php: '#818cf8',
  ruby: '#f43f5e',
  swift: '#f97316',
  kotlin: '#a855f7',
  dart: '#0ea5e9',
  sql: '#38bdf8',
  graphql: '#ec4899',
  json: '#eab308',
  prisma: '#2dd4bf',
  bash: '#22c55e',
  powershell: '#3b82f6',
  yaml: '#f43f5e',
  xml: '#fb923c',
  dockerfile: '#0ea5e9',
  markdown: '#94a3b8',
  plaintext: '#71717a',
};

export const CODE_LANGUAGE_TEMPLATES: Record<string, string> = {
  typescript: `// Bloco de código (duplo clique para editar)\nexport async function syncBoard(boardId: string): Promise<boolean> {\n  const res = await fetch(\`/api/boards/\${boardId}\`);\n  return res.ok === true;\n}`,
  javascript: `// Processa itens ativos do quadro\nexport async function syncBoard(boardId) {\n  const res = await fetch(\`/api/boards/\${boardId}\`);\n  const data = await res.json();\n  return data.items ?? [];\n}`,
  tsx: `// Componente React / TSX\nexport function StatusBadge({ online = true }: { online?: boolean }) {\n  return (\n    <span className="px-2 py-1 rounded-md text-xs">\n      {online ? "Conectado" : "Offline"}\n    </span>\n  );\n}`,
  html: `<!-- Card de destaque -->\n<section class="hero-card" data-theme="dark">\n  <h2>Arquitetura Mirio</h2>\n  <p>Colaboração visual em tempo real.</p>\n  <button type="button"> Começar agora </button>\n</section>`,
  css: `/* Estilo do container flutuante */\n.toolbar-panel:hover {\n  display: flex;\n  gap: 8px;\n  padding: 10px 14px;\n  background-color: #0f172a;\n  border-radius: 12px !important;\n}`,
  python: `# Análise de métricas do quadro\nfrom dataclasses import dataclass\n\n@dataclass\nclass BoardSummary:\n    title: str\n    active_users: int = 1\n\ndef format_status(board: BoardSummary) -> str:\n    return f"{board.title}: {board.active_users} online"`,
  java: `// Serviço de sincronização do quadro\npublic record BoardEvent(String id, int version, boolean active) {}\n\npublic class BoardService {\n    public String describe(BoardEvent event) {\n        return event.active() ? "Ativo v" + event.version() : "Pausado";\n    }\n}`,
  csharp: `// Endpoint de consulta do quadro\n[ApiController]\n[Route("api/boards")]\npublic class BoardsController : ControllerBase\n{\n    [HttpGet("{id}")]\n    public async Task<IActionResult> GetById(Guid id)\n    {\n        return Ok(new { Id = id, Realtime = true });\n    }\n}`,
  cpp: `// Cálculo rápido de viewport\n#include <vector>\n#include <string>\n\nstruct Point2D {\n    double x = 0.0;\n    double y = 0.0;\n};\n\nint countVisible(const std::vector<Point2D>& pts) {\n    return static_cast<int>(pts.size());\n}`,
  go: `// Handler HTTP em Go\npackage main\n\nimport "fmt"\n\ntype Board struct {\n\tID     string\n\tActive bool\n}\n\nfunc Summary(b Board) string {\n\treturn fmt.Sprintf("board=%s active=%v", b.ID, b.Active)\n}`,
  rust: `// Estado imutável sincronizado\n#[derive(Debug, Clone)]\npub struct BoardState {\n    pub id: String,\n    pub items: usize,\n}\n\nimpl BoardState {\n    pub fn is_empty(&self) -> bool {\n        self.items == 0\n    }\n}`,
  php: `<?php\n// Validação rápida de sessão\nfinal class BoardSession\n{\n    public function __construct(\n        public readonly string $boardId,\n        public bool $canEdit = true,\n    ) {}\n}`,
  ruby: `# Modelo de quadro colaborativo\nclass BoardRoom\n  attr_reader :title, :members\n\n  def initialize(title:, members: [])\n    @title = title\n    @members = members\n  end\n\n  def active?\n    @members.any?\n  end\nend`,
  swift: `// Modelo Swift concorrente\nimport Foundation\n\nstruct BoardSnapshot: Codable {\n    let id: String\n    var itemCount: Int = 0\n\n    func summary() -> String {\n        return "Quadro \\(id) (\\(itemCount) itens)"\n    }\n}`,
  kotlin: `// Estado reativo em Kotlin\ndata class BoardUiState(\n    val boardId: String,\n    val count: Int = 0,\n    val isSynced: Boolean = true,\n)\n\nsuspend fun fetchBoardLabel(state: BoardUiState): String {\n    return "\${state.boardId} • \${state.count} itens"\n}`,
  dart: `// Widget imutável Flutter / Dart\nclass BoardHeader {\n  final String title;\n  final int onlineCount;\n\n  const BoardHeader({required this.title, this.onlineCount = 1});\n\n  String get subtitle => '$title ($onlineCount online)';\n}`,
  sql: `-- Consulta de quadros ativos nos últimos 7 dias\nSELECT b.id, b.title, COUNT(e.id) AS total_elements\nFROM boards b\nLEFT JOIN elements e ON e.board_id = b.id\nWHERE b.deleted_at IS NULL\nGROUP BY b.id, b.title\nORDER BY total_elements DESC\nLIMIT 10;`,
  graphql: `# Consulta de quadro e participantes\nquery GetBoard($boardId: ID!) {\n  board(id: $boardId) {\n    id\n    title\n    isPublic\n    elements(limit: 50) {\n      id\n      type\n    }\n  }\n}`,
  json: `{\n  "project": "Mirio Whiteboard",\n  "version": 2,\n  "realtime": true,\n  "limits": {\n    "maxElements": 5000,\n    "fpsTarget": 60\n  },\n  "features": ["kanban", "mindmap", "code"]\n}`,
  prisma: `// Schema do banco de dados Prisma\nmodel Board {\n  id        String   @id @default(uuid())\n  title     String\n  isPublic  Boolean  @default(false)\n  createdAt DateTime @default(now())\n}`,
  bash: `#!/usr/bin/env bash\n# Deploy de produção verificado\nexport NODE_ENV="production"\n\nnpm run lint && npm test\nnpm run build -- --outDir dist\necho "Build finalizado em $NODE_ENV"`,
  powershell: `# Automação de verificação local\n$ErrorActionPreference = "Stop"\n$env:NODE_ENV = "production"\n\nnpm run lint\nnpm run build\nWrite-Host "Build concluído com sucesso!"`,
  yaml: `# Pipeline de serviço em container\nservices:\n  mirio-web:\n    image: node:22-alpine\n    ports:\n      - "5173:5173"\n    environment:\n      NODE_ENV: production\n    restart: unless-stopped`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Configuração de layout -->\n<board id="sprint-q4" realtime="true">\n  <owner name="Equipe Produto" />\n  <frame title="Backlog Priorizado" items="12" />\n</board>`,
  dockerfile: `# Imagem otimizada multi-stage\nFROM node:22-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --ignore-scripts\nCOPY . .\nRUN npm run build\n\nEXPOSE 4173\nCMD ["npm", "run", "preview"]`,
  markdown: `# Notas da Arquitetura\n\n> Resumo das decisões técnicas da sprint.\n\n- [x] Sincronização em **tempo real** via \`WebSocket\`\n- [ ] Exportação vetorial em [Mirio Docs](https://mirio.app)`,
  plaintext: `Anote especificações técnicas, logs ou rascunhos aqui.\nDuplo clique no bloco para editar o conteúdo livremente.`,
};

const LEGACY_DEFAULT_SNIPPETS = new Set<string>([
  `// Bloco de código (duplo clique para editar)\nexport function helloMirio(team: string) {\n  return \`Olá, \${team}!\`;\n}`,
  `async function syncBoard(boardId: string) {\n  const state = await fetchState(boardId);\n  return state.items;\n}`,
  ...Object.values(CODE_LANGUAGE_TEMPLATES),
].map((s) => s.replace(/\r\n/g, '\n').trim()));

export function getDefaultCodeSnippet(languageId: string): string {
  return CODE_LANGUAGE_TEMPLATES[languageId] || CODE_LANGUAGE_TEMPLATES.typescript;
}

export function isUntouchedDefaultCodeSnippet(text?: string): boolean {
  if (!text || !text.trim()) return true;
  return LEGACY_DEFAULT_SNIPPETS.has(text.replace(/\r\n/g, '\n').trim());
}

interface LanguageGrammarProfile {
  cComments?: boolean;
  hashComments?: boolean;
  cPreprocessor?: boolean;
  phpTags?: boolean;
  dollarVars?: boolean;
  rustSyntax?: boolean;
  csharpAttributes?: boolean;
  jsxTags?: boolean;
  keywords: ReadonlySet<string>;
  storage: ReadonlySet<string>;
  types: ReadonlySet<string>;
  constants: ReadonlySet<string>;
  builtins?: ReadonlySet<string>;
}

const JS_COMMON_KEYWORDS = [
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
  'return', 'try', 'catch', 'finally', 'throw', 'import', 'from', 'export', 'as',
  'async', 'await', 'yield', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'void',
];
const JS_COMMON_STORAGE = [
  'const', 'let', 'var', 'function', 'class', 'extends', 'static', 'get', 'set',
];
const JS_COMMON_CONSTANTS = [
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'this', 'super', 'arguments',
];
const JS_COMMON_TYPES = [
  'Array', 'Object', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp',
  'Error', 'URL', 'Response', 'Request', 'Headers', 'AbortController', 'Symbol', 'BigInt',
];
const JS_COMMON_BUILTINS = [
  'console', 'Math', 'JSON', 'Number', 'String', 'Boolean', 'fetch', 'setTimeout',
  'clearTimeout', 'requestAnimationFrame', 'document', 'window', 'navigator',
];

const TS_EXTRA_KEYWORDS = ['satisfies', 'keyof', 'infer', 'is', 'asserts', 'out'];
const TS_EXTRA_STORAGE = [
  'type', 'interface', 'enum', 'namespace', 'declare', 'abstract', 'implements',
  'readonly', 'public', 'private', 'protected', 'override',
];
const TS_EXTRA_TYPES = [
  'string', 'number', 'boolean', 'any', 'unknown', 'never', 'object', 'bigint', 'symbol',
  'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract',
  'NonNullable', 'ReturnType', 'Parameters', 'Awaited', 'React', 'JSX',
];

const GRAMMAR_PROFILES: Record<string, LanguageGrammarProfile> = {
  javascript: {
    cComments: true,
    keywords: new Set(JS_COMMON_KEYWORDS),
    storage: new Set(JS_COMMON_STORAGE),
    types: new Set(JS_COMMON_TYPES),
    constants: new Set(JS_COMMON_CONSTANTS),
    builtins: new Set(JS_COMMON_BUILTINS),
  },
  typescript: {
    cComments: true,
    keywords: new Set([...JS_COMMON_KEYWORDS, ...TS_EXTRA_KEYWORDS]),
    storage: new Set([...JS_COMMON_STORAGE, ...TS_EXTRA_STORAGE]),
    types: new Set([...JS_COMMON_TYPES, ...TS_EXTRA_TYPES]),
    constants: new Set(JS_COMMON_CONSTANTS),
    builtins: new Set(JS_COMMON_BUILTINS),
  },
  tsx: {
    cComments: true,
    jsxTags: true,
    keywords: new Set([...JS_COMMON_KEYWORDS, ...TS_EXTRA_KEYWORDS]),
    storage: new Set([...JS_COMMON_STORAGE, ...TS_EXTRA_STORAGE]),
    types: new Set([...JS_COMMON_TYPES, ...TS_EXTRA_TYPES]),
    constants: new Set(JS_COMMON_CONSTANTS),
    builtins: new Set(JS_COMMON_BUILTINS),
  },
  python: {
    hashComments: true,
    keywords: new Set([
      'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'return', 'pass',
      'try', 'except', 'finally', 'raise', 'with', 'as', 'import', 'from', 'assert',
      'yield', 'async', 'await', 'and', 'or', 'not', 'in', 'is', 'del', 'match', 'case',
    ]),
    storage: new Set(['def', 'class', 'lambda', 'global', 'nonlocal', 'type']),
    types: new Set([
      'int', 'str', 'float', 'bool', 'bytes', 'list', 'dict', 'set', 'tuple', 'object',
      'Any', 'Optional', 'Union', 'List', 'Dict', 'Set', 'Tuple', 'Callable', 'Iterable',
    ]),
    constants: new Set(['True', 'False', 'None', 'self', 'cls', 'Ellipsis', 'NotImplemented']),
    builtins: new Set([
      'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sum', 'min', 'max',
      'sorted', 'reversed', 'isinstance', 'getattr', 'setattr', 'hasattr', 'open', 'super',
    ]),
  },
  java: {
    cComments: true,
    keywords: new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
      'return', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'import', 'package',
      'instanceof', 'assert', 'when', 'yield',
    ]),
    storage: new Set([
      'public', 'private', 'protected', 'class', 'interface', 'enum', 'record', 'extends',
      'implements', 'static', 'final', 'abstract', 'synchronized', 'volatile', 'transient',
      'sealed', 'permits', 'var',
    ]),
    types: new Set([
      'void', 'int', 'long', 'short', 'byte', 'float', 'double', 'boolean', 'char',
      'String', 'Integer', 'Long', 'Double', 'Boolean', 'Object', 'List', 'Map', 'Set',
      'Optional', 'Stream', 'CompletableFuture',
    ]),
    constants: new Set(['true', 'false', 'null', 'this', 'super']),
  },
  csharp: {
    cComments: true,
    cPreprocessor: true,
    csharpAttributes: true,
    keywords: new Set([
      'if', 'else', 'for', 'foreach', 'in', 'while', 'do', 'switch', 'case', 'default',
      'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'new', 'using',
      'async', 'await', 'yield', 'is', 'as', 'when', 'where', 'from', 'select', 'orderby',
      'nameof', 'typeof', 'sizeof', 'lock', 'checked', 'unchecked',
    ]),
    storage: new Set([
      'namespace', 'class', 'struct', 'record', 'interface', 'enum', 'delegate', 'event',
      'public', 'private', 'protected', 'internal', 'static', 'readonly', 'const',
      'virtual', 'override', 'abstract', 'sealed', 'partial', 'var', 'get', 'set', 'init', 'required',
    ]),
    types: new Set([
      'void', 'bool', 'byte', 'char', 'decimal', 'double', 'float', 'int', 'long', 'sbyte',
      'short', 'string', 'uint', 'ulong', 'ushort', 'object', 'dynamic', 'Guid', 'DateTime',
      'TimeSpan', 'Task', 'ValueTask', 'IActionResult', 'ActionResult', 'List', 'Dictionary', 'IEnumerable',
    ]),
    constants: new Set(['true', 'false', 'null', 'this', 'base']),
  },
  cpp: {
    cComments: true,
    cPreprocessor: true,
    keywords: new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
      'return', 'try', 'catch', 'throw', 'new', 'delete', 'sizeof', 'alignof', 'using',
      'co_await', 'co_return', 'co_yield', 'static_cast', 'dynamic_cast', 'reinterpret_cast', 'const_cast',
    ]),
    storage: new Set([
      'namespace', 'class', 'struct', 'union', 'enum', 'template', 'typename', 'concept',
      'public', 'private', 'protected', 'virtual', 'override', 'final', 'static', 'const',
      'constexpr', 'consteval', 'inline', 'explicit', 'friend', 'mutable', 'extern', 'auto', 'typedef',
    ]),
    types: new Set([
      'void', 'bool', 'char', 'short', 'int', 'long', 'float', 'double', 'unsigned', 'signed',
      'size_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int32_t', 'int64_t',
      'std', 'string', 'string_view', 'vector', 'map', 'unordered_map', 'set', 'optional', 'unique_ptr', 'shared_ptr',
    ]),
    constants: new Set(['true', 'false', 'nullptr', 'NULL', 'this']),
  },
  go: {
    cComments: true,
    keywords: new Set([
      'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'select', 'break',
      'continue', 'goto', 'fallthrough', 'return', 'defer', 'go', 'import', 'package',
    ]),
    storage: new Set(['func', 'type', 'struct', 'interface', 'map', 'chan', 'var', 'const']),
    types: new Set([
      'bool', 'byte', 'complex64', 'complex128', 'error', 'float32', 'float64',
      'int', 'int8', 'int16', 'int32', 'int64', 'rune', 'string',
      'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr', 'any', 'Context',
    ]),
    constants: new Set(['true', 'false', 'nil', 'iota']),
    builtins: new Set(['make', 'len', 'cap', 'new', 'append', 'copy', 'close', 'delete', 'panic', 'recover', 'print', 'println']),
  },
  rust: {
    cComments: true,
    rustSyntax: true,
    keywords: new Set([
      'if', 'else', 'match', 'for', 'in', 'while', 'loop', 'break', 'continue', 'return',
      'use', 'as', 'where', 'async', 'await', 'move', 'unsafe', 'extern',
    ]),
    storage: new Set([
      'fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'union', 'trait', 'impl',
      'type', 'mod', 'pub', 'crate', 'super', 'ref', 'dyn',
    ]),
    types: new Set([
      'bool', 'char', 'str', 'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
      'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'f32', 'f64',
      'String', 'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'HashMap', 'HashSet', 'Cow',
    ]),
    constants: new Set(['true', 'false', 'Some', 'None', 'Ok', 'Err', 'self', 'Self']),
  },
  php: {
    cComments: true,
    hashComments: true,
    phpTags: true,
    dollarVars: true,
    keywords: new Set([
      'if', 'elseif', 'else', 'for', 'foreach', 'as', 'while', 'do', 'switch', 'case',
      'default', 'break', 'continue', 'match', 'return', 'try', 'catch', 'finally', 'throw',
      'new', 'clone', 'instanceof', 'use', 'echo', 'print', 'require', 'require_once', 'include', 'include_once', 'yield',
    ]),
    storage: new Set([
      'namespace', 'class', 'interface', 'trait', 'enum', 'extends', 'implements',
      'function', 'fn', 'public', 'private', 'protected', 'static', 'final', 'abstract',
      'readonly', 'const', 'var', 'global', 'declare',
    ]),
    types: new Set(['int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'iterable', 'void', 'mixed', 'never']),
    constants: new Set(['true', 'false', 'null', 'TRUE', 'FALSE', 'NULL', 'self', 'parent', 'static']),
  },
  ruby: {
    hashComments: true,
    keywords: new Set([
      'if', 'elsif', 'else', 'unless', 'case', 'when', 'while', 'until', 'for', 'in',
      'do', 'break', 'next', 'redo', 'retry', 'return', 'yield', 'begin', 'rescue',
      'ensure', 'raise', 'require', 'require_relative', 'include', 'extend', 'prepend', 'and', 'or', 'not', 'end',
    ]),
    storage: new Set(['def', 'class', 'module', 'alias', 'undef', 'attr_reader', 'attr_writer', 'attr_accessor', 'private', 'protected', 'public']),
    types: new Set(['String', 'Integer', 'Float', 'Array', 'Hash', 'Symbol', 'Proc', 'Time', 'File', 'Regexp']),
    constants: new Set(['true', 'false', 'nil', 'self', 'super', '__FILE__', '__LINE__']),
  },
  swift: {
    cComments: true,
    keywords: new Set([
      'if', 'else', 'guard', 'switch', 'case', 'default', 'for', 'in', 'while', 'repeat',
      'break', 'continue', 'fallthrough', 'return', 'throw', 'throws', 'rethrows', 'do',
      'try', 'catch', 'import', 'where', 'as', 'is', 'async', 'await', 'defer',
    ]),
    storage: new Set([
      'func', 'let', 'var', 'struct', 'class', 'enum', 'protocol', 'extension', 'actor',
      'typealias', 'init', 'deinit', 'subscript', 'public', 'private', 'fileprivate',
      'internal', 'open', 'static', 'final', 'override', 'mutating', 'weak', 'lazy', 'some', 'any',
    ]),
    types: new Set(['Int', 'Double', 'Float', 'Bool', 'String', 'Character', 'Void', 'Any', 'AnyObject', 'Array', 'Dictionary', 'Set', 'Optional', 'Result', 'URL', 'Data', 'Date', 'UUID']),
    constants: new Set(['true', 'false', 'nil', 'self', 'Self', 'super']),
  },
  kotlin: {
    cComments: true,
    keywords: new Set([
      'if', 'else', 'when', 'for', 'in', 'while', 'do', 'break', 'continue', 'return',
      'try', 'catch', 'finally', 'throw', 'import', 'package', 'is', 'as', 'by', 'where',
    ]),
    storage: new Set([
      'fun', 'val', 'var', 'class', 'interface', 'object', 'data', 'sealed', 'enum',
      'annotation', 'companion', 'constructor', 'init', 'open', 'abstract', 'final',
      'override', 'private', 'protected', 'public', 'internal', 'suspend', 'inline', 'lateinit', 'typealias',
    ]),
    types: new Set(['Int', 'Long', 'Short', 'Byte', 'Double', 'Float', 'Boolean', 'Char', 'String', 'Unit', 'Nothing', 'Any', 'List', 'MutableList', 'Map', 'Set', 'Flow', 'StateFlow']),
    constants: new Set(['true', 'false', 'null', 'this', 'super', 'it']),
  },
  dart: {
    cComments: true,
    keywords: new Set([
      'if', 'else', 'for', 'in', 'while', 'do', 'switch', 'case', 'default', 'break',
      'continue', 'return', 'try', 'on', 'catch', 'finally', 'throw', 'rethrow',
      'import', 'export', 'part', 'as', 'is', 'async', 'await', 'yield', 'new', 'show', 'hide',
    ]),
    storage: new Set([
      'class', 'mixin', 'enum', 'extension', 'typedef', 'extends', 'implements', 'with',
      'abstract', 'sealed', 'final', 'const', 'var', 'late', 'static', 'covariant', 'required', 'get', 'set', 'factory',
    ]),
    types: new Set(['void', 'int', 'double', 'num', 'bool', 'String', 'dynamic', 'Object', 'Never', 'Future', 'Stream', 'List', 'Map', 'Set', 'Iterable', 'Widget', 'BuildContext', 'StatelessWidget', 'StatefulWidget']),
    constants: new Set(['true', 'false', 'null', 'this', 'super']),
  },
};

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
  'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'IS', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'FETCH',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'TRUNCATE', 'MERGE',
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'VIEW', 'INDEX', 'SCHEMA', 'DATABASE', 'TRIGGER',
  'PRIMARY', 'FOREIGN', 'KEY', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'CONSTRAINT',
  'DISTINCT', 'ALL', 'UNION', 'INTERSECT', 'EXCEPT', 'WITH', 'RECURSIVE', 'RETURNING',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'GRANT', 'REVOKE',
]);

const SQL_TYPES = new Set([
  'INT', 'INTEGER', 'SMALLINT', 'BIGINT', 'SERIAL', 'BIGSERIAL', 'DECIMAL', 'NUMERIC',
  'REAL', 'FLOAT', 'DOUBLE', 'PRECISION', 'VARCHAR', 'CHAR', 'CHARACTER', 'VARYING',
  'TEXT', 'BOOLEAN', 'BOOL', 'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ', 'INTERVAL',
  'UUID', 'JSON', 'JSONB', 'BYTEA', 'BLOB', 'ARRAY',
]);

const SQL_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'NOW', 'CURRENT_TIMESTAMP',
  'CURRENT_DATE', 'LOWER', 'UPPER', 'TRIM', 'LENGTH', 'SUBSTRING', 'CONCAT', 'REPLACE',
  'ROUND', 'FLOOR', 'CEIL', 'ABS', 'CAST', 'EXTRACT', 'DATE_TRUNC', 'ROW_NUMBER',
  'RANK', 'DENSE_RANK', 'OVER', 'PARTITION', 'ARRAY_AGG', 'JSON_BUILD_OBJECT',
]);

const DOCKER_KEYWORDS = new Set([
  'FROM', 'AS', 'WORKDIR', 'COPY', 'ADD', 'RUN', 'ENV', 'ARG', 'EXPOSE', 'USER',
  'VOLUME', 'ENTRYPOINT', 'CMD', 'LABEL', 'MAINTAINER', 'HEALTHCHECK', 'SHELL', 'STOPSIGNAL', 'ONBUILD',
]);

const SHELL_KEYWORDS = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'until',
  'case', 'esac', 'select', 'function', 'return', 'exit', 'break', 'continue',
  'export', 'local', 'readonly', 'declare', 'typeset', 'unset', 'shift', 'source',
  'sudo', 'param', 'begin', 'process', 'end', 'foreach', 'try', 'catch', 'finally', 'throw',
]);

const SHELL_COMMANDS = new Set([
  'echo', 'printf', 'cd', 'pwd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'cat',
  'grep', 'sed', 'awk', 'find', 'xargs', 'chmod', 'chown', 'tar', 'gzip', 'curl', 'wget',
  'git', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'node', 'deno', 'python', 'python3', 'pip',
  'docker', 'docker-compose', 'kubectl', 'helm', 'terraform', 'make', 'cargo', 'go',
  'Write-Host', 'Write-Output', 'Get-ChildItem', 'Select-Object', 'Where-Object',
  'ForEach-Object', 'Set-Location', 'New-Item', 'Remove-Item', 'Invoke-RestMethod', 'Invoke-WebRequest',
]);

const CSS_VALUE_KEYWORDS = new Set([
  'flex', 'inline-flex', 'grid', 'inline-grid', 'block', 'inline-block', 'inline', 'none',
  'contents', 'relative', 'absolute', 'fixed', 'sticky', 'static', 'center', 'space-between',
  'space-around', 'space-evenly', 'flex-start', 'flex-end', 'stretch', 'baseline',
  'row', 'column', 'wrap', 'nowrap', 'hidden', 'visible', 'scroll', 'auto', 'pointer',
  'default', 'solid', 'dashed', 'dotted', 'transparent', 'currentColor', 'inherit',
  'initial', 'unset', 'bold', 'normal', 'italic', 'uppercase', 'lowercase', 'capitalize',
  'border-box', 'content-box', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'infinite', 'forwards',
]);

const GRAPHQL_PRISMA_KEYWORDS = new Set([
  'query', 'mutation', 'subscription', 'fragment', 'on', 'type', 'input', 'enum',
  'interface', 'union', 'scalar', 'schema', 'extend', 'directive', 'implements',
  'model', 'datasource', 'generator',
]);

const GRAPHQL_PRISMA_TYPES = new Set([
  'ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt',
]);

type BlockMode =
  | 'normal'
  | 'block-comment'
  | 'html-comment'
  | 'py-triple-double'
  | 'py-triple-single'
  | 'css-rule-body'
  | { fencedLang: string };

function pushToken(tokens: CodeSyntaxToken[], text: string, kind: CodeTokenKind): void {
  if (!text) return;
  const prev = tokens[tokens.length - 1];
  if (prev && prev.kind === kind) {
    prev.text += text;
  } else {
    tokens.push({ text, kind });
  }
}

function consumeQuotedString(line: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < line.length) {
    if (line[i] === '\\') {
      i += 2;
      continue;
    }
    if (line[i] === quote) {
      return i + 1;
    }
    i++;
  }
  return line.length;
}

function tokenizeTemplateLiteral(line: string, start: number, tokens: CodeSyntaxToken[], profile: LanguageGrammarProfile): number {
  let i = start + 1;
  let segStart = start;
  while (i < line.length) {
    if (line[i] === '\\') {
      i += 2;
      continue;
    }
    if (line[i] === '$' && line[i + 1] === '{') {
      pushToken(tokens, line.slice(segStart, i), 'string');
      pushToken(tokens, '${', 'decorator');
      i += 2;
      const exprStart = i;
      let depth = 1;
      while (i < line.length && depth > 0) {
        if (line[i] === '{') depth++;
        else if (line[i] === '}') depth--;
        if (depth > 0) i++;
      }
      const expr = line.slice(exprStart, i);
      if (expr) {
        const inner = tokenizeGeneralCodeLine(expr, profile, 'normal').tokens;
        for (const t of inner) pushToken(tokens, t.text, t.kind);
      }
      if (i < line.length && line[i] === '}') {
        pushToken(tokens, '}', 'decorator');
        i++;
      }
      segStart = i;
      continue;
    }
    if (line[i] === '`') {
      pushToken(tokens, line.slice(segStart, i + 1), 'string');
      return i + 1;
    }
    i++;
  }
  pushToken(tokens, line.slice(segStart), 'string');
  return line.length;
}

function tokenizeGeneralCodeLine(
  line: string,
  profile: LanguageGrammarProfile,
  mode: BlockMode
): { tokens: CodeSyntaxToken[]; nextMode: BlockMode } {
  if (!line) return { tokens: [{ text: '', kind: 'plain' }], nextMode: mode };

  const tokens: CodeSyntaxToken[] = [];
  let i = 0;
  let curMode = mode;

  if (curMode === 'block-comment') {
    const closeIdx = line.indexOf('*/');
    if (closeIdx === -1) {
      return { tokens: [{ text: line, kind: 'comment' }], nextMode: 'block-comment' };
    }
    pushToken(tokens, line.slice(0, closeIdx + 2), 'comment');
    i = closeIdx + 2;
    curMode = 'normal';
  } else if (curMode === 'py-triple-double' || curMode === 'py-triple-single') {
    const delim = curMode === 'py-triple-double' ? '"""' : "'''";
    const closeIdx = line.indexOf(delim);
    if (closeIdx === -1) {
      return { tokens: [{ text: line, kind: 'string' }], nextMode: curMode };
    }
    pushToken(tokens, line.slice(0, closeIdx + 3), 'string');
    i = closeIdx + 3;
    curMode = 'normal';
  }

  // Diretivas de pré-processador C / C++ / C# (#include, #define, #pragma, #region)
  if (i === 0 && profile.cPreprocessor) {
    const preMatch = /^(\s*)(#\s*[A-Za-z_]\w*)(.*)$/.exec(line);
    if (preMatch) {
      const [, ws, directive, rest] = preMatch;
      pushToken(tokens, ws, 'plain');
      pushToken(tokens, directive, 'decorator');
      const angleMatch = /^(\s*)(<[^>]+>)(.*)$/.exec(rest);
      if (angleMatch) {
        pushToken(tokens, angleMatch[1], 'plain');
        pushToken(tokens, angleMatch[2], 'string');
        pushToken(tokens, angleMatch[3], 'plain');
      } else {
        pushToken(tokens, rest, 'plain');
      }
      return { tokens, nextMode: curMode };
    }
  }

  let prevSignificantWord = '';
  let prevChar = '';

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    // Espaços em branco
    if (ch === ' ' || ch === '\t') {
      let end = i + 1;
      while (end < line.length && (line[end] === ' ' || line[end] === '\t')) end++;
      pushToken(tokens, line.slice(i, end), 'plain');
      i = end;
      continue;
    }

    // Tag PHP <?php / ?>
    if (profile.phpTags && (line.startsWith('<?php', i) || line.startsWith('<?=', i) || line.startsWith('?>', i))) {
      const len = line.startsWith('<?php', i) ? 5 : line.startsWith('<?=', i) ? 3 : 2;
      pushToken(tokens, line.slice(i, i + len), 'keyword');
      i += len;
      continue;
    }

    // Comentários C-style (// e /* */)
    if (profile.cComments && ch === '/' && next === '/') {
      pushToken(tokens, line.slice(i), 'comment');
      break;
    }
    if (profile.cComments && ch === '/' && next === '*') {
      const closeIdx = line.indexOf('*/', i + 2);
      if (closeIdx === -1) {
        pushToken(tokens, line.slice(i), 'comment');
        curMode = 'block-comment';
        break;
      }
      pushToken(tokens, line.slice(i, closeIdx + 2), 'comment');
      i = closeIdx + 2;
      continue;
    }

    // Comentários # (Python, Ruby, PHP)
    if (profile.hashComments && ch === '#' && !(profile.rustSyntax && next === '[')) {
      pushToken(tokens, line.slice(i), 'comment');
      break;
    }

    // Atributos Rust #[derive(...)] ou #![...]
    if (profile.rustSyntax && ch === '#' && (next === '[' || (next === '!' && line[i + 2] === '['))) {
      const closeBracket = line.indexOf(']', i + 2);
      if (closeBracket !== -1) {
        pushToken(tokens, line.slice(i, closeBracket + 1), 'decorator');
        i = closeBracket + 1;
        continue;
      }
    }

    // Atributos C# no início da linha: [ApiController], [HttpGet("{id}")]
    if (profile.csharpAttributes && ch === '[' && prevSignificantWord === '') {
      const closeBracket = line.lastIndexOf(']');
      if (closeBracket > i && /^\[\s*[A-Z]\w*/.test(line.slice(i))) {
        pushToken(tokens, line.slice(i, closeBracket + 1), 'decorator');
        i = closeBracket + 1;
        continue;
      }
    }

    // Docstrings triplas Python (""" ou ''')
    if (profile.hashComments && (line.startsWith('"""', i) || line.startsWith("'''", i))) {
      const delim = line.slice(i, i + 3);
      const closeIdx = line.indexOf(delim, i + 3);
      if (closeIdx === -1) {
        pushToken(tokens, line.slice(i), 'string');
        curMode = delim === '"""' ? 'py-triple-double' : 'py-triple-single';
        break;
      }
      pushToken(tokens, line.slice(i, closeIdx + 3), 'string');
      i = closeIdx + 3;
      continue;
    }

    // f-strings / raw strings Python (f"...", r"...")
    if (profile.hashComments && (ch === 'f' || ch === 'r' || ch === 'b') && (next === '"' || next === "'")) {
      pushToken(tokens, ch, 'storage');
      const end = consumeQuotedString(line, i + 1, next);
      pushToken(tokens, line.slice(i + 1, end), 'string');
      i = end;
      continue;
    }

    // Lifetimes em Rust ('a, 'static) vs char literal ('x')
    if (profile.rustSyntax && ch === "'" && /[a-zA-Z_]/.test(next || '') && line[i + 2] !== "'") {
      let end = i + 2;
      while (end < line.length && /\w/.test(line[end])) end++;
      pushToken(tokens, line.slice(i, end), 'decorator');
      i = end;
      continue;
    }

    // Strings com aspas duplas, simples ou template literal (`...`)
    if (ch === '"' || ch === "'") {
      const end = consumeQuotedString(line, i, ch);
      pushToken(tokens, line.slice(i, end), 'string');
      prevChar = ch;
      i = end;
      continue;
    }
    if (ch === '`') {
      i = tokenizeTemplateLiteral(line, i, tokens, profile);
      prevChar = '`';
      continue;
    }

    // Tags JSX em TSX (<Button ... /> ou </div>)
    if (
      profile.jsxTags &&
      ch === '<' &&
      (next === '/' || /[A-Za-z]/.test(next || '')) &&
      prevSignificantWord !== 'function' &&
      prevSignificantWord !== 'interface' &&
      prevSignificantWord !== 'type' &&
      prevSignificantWord !== 'class' &&
      prevChar !== 'w' // evita confundir Promise<boolean> (onde prevChar === 'w' de identificador)
    ) {
      const tagMatch = /^(<\/?)([A-Za-z][\w.]*)/.exec(line.slice(i));
      if (tagMatch) {
        pushToken(tokens, tagMatch[1], 'operator');
        const tagName = tagMatch[2];
        pushToken(tokens, tagName, /^[A-Z]/.test(tagName) ? 'type' : 'tag');
        i += tagMatch[0].length;
        prevChar = '>';
        continue;
      }
    }

    // Decorators (@dataclass, @Injectable, @id) ou variáveis de instância Ruby (@title)
    if (ch === '@' && /[A-Za-z_]/.test(next || '')) {
      let end = i + 2;
      while (end < line.length && /[\w.]/.test(line[end])) end++;
      pushToken(tokens, line.slice(i, end), 'decorator');
      i = end;
      continue;
    }

    // Variáveis PHP ($boardId)
    if (profile.dollarVars && ch === '$' && /[A-Za-z_]/.test(next || '')) {
      let end = i + 2;
      while (end < line.length && /\w/.test(line[end])) end++;
      const varText = line.slice(i, end);
      pushToken(tokens, varText, varText === '$this' ? 'constant' : 'property');
      prevChar = 'w';
      i = end;
      continue;
    }

    // Símbolos Ruby (:title)
    if (profile.hashComments && !profile.phpTags && ch === ':' && /[a-zA-Z_]/.test(next || '') && prevChar !== ':') {
      let end = i + 2;
      while (end < line.length && /\w/.test(line[end])) end++;
      pushToken(tokens, line.slice(i, end), 'constant');
      i = end;
      continue;
    }

    // Números (hex 0xFF, bin 0b10, floats 3.14, sufixos numéricos)
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(next || ''))) {
      const numMatch = /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?(?:[uif]\d+|n|f|d|L)?)/.exec(
        line.slice(i)
      );
      if (numMatch) {
        pushToken(tokens, numMatch[0], 'number');
        i += numMatch[0].length;
        prevChar = '0';
        continue;
      }
    }

    // Identificadores, Keywords, Tipos, Propriedades e Funções
    if (/[A-Za-z_$]/.test(ch)) {
      let end = i + 1;
      while (end < line.length && /[\w$]/.test(line[end])) end++;
      const word = line.slice(i, end);
      const afterSlice = line.slice(end);

      // Macro em Rust: println!(...) ou vec![...]
      if (profile.rustSyntax && line[end] === '!') {
        pushToken(tokens, `${word}!`, 'function');
        i = end + 1;
        prevSignificantWord = word;
        prevChar = '!';
        continue;
      }

      let kind: CodeTokenKind = 'plain';

      if (prevChar === '.') {
        kind = /^\s*\(/.test(afterSlice) ? 'function' : 'property';
      } else if (
        prevSignificantWord === 'function' ||
        prevSignificantWord === 'def' ||
        prevSignificantWord === 'fn' ||
        prevSignificantWord === 'func' ||
        prevSignificantWord === 'fun'
      ) {
        kind = 'function';
      } else if (
        prevSignificantWord === 'class' ||
        prevSignificantWord === 'interface' ||
        prevSignificantWord === 'struct' ||
        prevSignificantWord === 'enum' ||
        prevSignificantWord === 'trait' ||
        prevSignificantWord === 'record' ||
        prevSignificantWord === 'type' ||
        prevSignificantWord === 'extends' ||
        prevSignificantWord === 'implements'
      ) {
        kind = 'type';
      } else if (profile.keywords.has(word)) {
        kind = 'keyword';
      } else if (profile.storage.has(word)) {
        kind = 'storage';
      } else if (profile.constants.has(word)) {
        kind = 'constant';
      } else if (profile.types.has(word)) {
        kind = 'type';
      } else if (/^\s*\(/.test(afterSlice)) {
        kind = /^[A-Z]/.test(word) && prevSignificantWord === 'new' ? 'type' : 'function';
      } else if (profile.builtins?.has(word)) {
        kind = 'type';
      } else if (/^\s*\??:(?!:)/.test(afterSlice)) {
        // Parâmetro tipado ou chave de objeto (ex: boardId: string, online?: boolean)
        kind = 'property';
      } else if (profile.jsxTags && /^\s*=/.test(afterSlice) && prevChar !== '=' && /^[a-zA-Z]/.test(word) && line.includes('<')) {
        kind = 'property';
      } else if (/^[A-Z][A-Z0-9_]{2,}$/.test(word)) {
        kind = 'constant';
      } else if (/^[A-Z][a-zA-Z0-9]*$/.test(word)) {
        kind = 'type';
      }

      pushToken(tokens, word, kind);
      prevSignificantWord = word;
      prevChar = 'w';
      i = end;
      continue;
    }

    // Operadores e pontuação
    const opMatch = /^(?:===|!==|=>|->|::|\.\.\.|&&|\|\||==|!=|<=|>=|\?\?|\?\.|[+\-*/%=<>!&|^~?:;,.()[\]{}])/.exec(
      line.slice(i)
    );
    if (opMatch) {
      const op = opMatch[0];
      pushToken(tokens, op, 'operator');
      prevChar = op[op.length - 1];
      i += op.length;
      continue;
    }

    pushToken(tokens, ch, 'plain');
    prevChar = ch;
    i++;
  }

  return { tokens: tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }], nextMode: curMode };
}

function tokenizeMarkupLine(
  line: string,
  mode: BlockMode
): { tokens: CodeSyntaxToken[]; nextMode: BlockMode } {
  if (!line) return { tokens: [{ text: '', kind: 'plain' }], nextMode: mode };
  const tokens: CodeSyntaxToken[] = [];
  let i = 0;
  let curMode = mode;

  if (curMode === 'html-comment') {
    const closeIdx = line.indexOf('-->');
    if (closeIdx === -1) {
      return { tokens: [{ text: line, kind: 'comment' }], nextMode: 'html-comment' };
    }
    pushToken(tokens, line.slice(0, closeIdx + 3), 'comment');
    i = closeIdx + 3;
    curMode = 'normal';
  }

  while (i < line.length) {
    if (line.startsWith('<!--', i)) {
      const closeIdx = line.indexOf('-->', i + 4);
      if (closeIdx === -1) {
        pushToken(tokens, line.slice(i), 'comment');
        curMode = 'html-comment';
        break;
      }
      pushToken(tokens, line.slice(i, closeIdx + 3), 'comment');
      i = closeIdx + 3;
      continue;
    }

    if (line.startsWith('<?xml', i) || line.startsWith('<!DOCTYPE', i) || line.startsWith('<!doctype', i)) {
      const closeIdx = line.indexOf('>', i + 2);
      if (closeIdx !== -1) {
        pushToken(tokens, line.slice(i, closeIdx + 1), 'decorator');
        i = closeIdx + 1;
        continue;
      }
    }

    if (line[i] === '<' && (line[i + 1] === '/' || /[A-Za-z!]/.test(line[i + 1] || ''))) {
      const openMatch = /^(<\/?)([A-Za-z][\w:-]*)/.exec(line.slice(i));
      if (openMatch) {
        pushToken(tokens, openMatch[1], 'operator');
        pushToken(tokens, openMatch[2], 'tag');
        i += openMatch[0].length;

        while (i < line.length) {
          if (line.startsWith('/>', i)) {
            pushToken(tokens, '/>', 'operator');
            i += 2;
            break;
          }
          if (line[i] === '>') {
            pushToken(tokens, '>', 'operator');
            i++;
            break;
          }
          if (line[i] === ' ' || line[i] === '\t') {
            pushToken(tokens, line[i], 'plain');
            i++;
            continue;
          }
          if (line[i] === '"' || line[i] === "'") {
            const end = consumeQuotedString(line, i, line[i]);
            pushToken(tokens, line.slice(i, end), 'string');
            i = end;
            continue;
          }
          if (line[i] === '=') {
            pushToken(tokens, '=', 'operator');
            i++;
            continue;
          }
          const attrMatch = /^[\w:-]+/.exec(line.slice(i));
          if (attrMatch) {
            pushToken(tokens, attrMatch[0], 'property');
            i += attrMatch[0].length;
            continue;
          }
          pushToken(tokens, line[i], 'plain');
          i++;
        }
        continue;
      }
    }

    // Entidades HTML (&nbsp;, &amp;)
    if (line[i] === '&') {
      const entMatch = /^&[a-zA-Z0-9#]+;/.exec(line.slice(i));
      if (entMatch) {
        pushToken(tokens, entMatch[0], 'constant');
        i += entMatch[0].length;
        continue;
      }
    }

    const nextLt = line.indexOf('<', i + 1);
    const nextAmp = line.indexOf('&', i + 1);
    let stop = line.length;
    if (nextLt !== -1 && nextLt < stop) stop = nextLt;
    if (nextAmp !== -1 && nextAmp < stop) stop = nextAmp;
    pushToken(tokens, line.slice(i, stop), 'plain');
    i = stop;
  }

  return { tokens: tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }], nextMode: curMode };
}

function tokenizeCssLine(
  line: string,
  mode: BlockMode
): { tokens: CodeSyntaxToken[]; nextMode: BlockMode } {
  if (!line) return { tokens: [{ text: '', kind: 'plain' }], nextMode: mode };
  const tokens: CodeSyntaxToken[] = [];
  let i = 0;
  let curMode = mode;

  if (curMode === 'block-comment') {
    const closeIdx = line.indexOf('*/');
    if (closeIdx === -1) {
      return { tokens: [{ text: line, kind: 'comment' }], nextMode: 'block-comment' };
    }
    pushToken(tokens, line.slice(0, closeIdx + 2), 'comment');
    i = closeIdx + 2;
    curMode = 'normal';
  }

  const inRule = curMode === 'css-rule-body' || (!line.includes('{') && /^\s*[\w-]+\s*:/.test(line));

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === ' ' || ch === '\t') {
      pushToken(tokens, ch, 'plain');
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      const closeIdx = line.indexOf('*/', i + 2);
      if (closeIdx === -1) {
        pushToken(tokens, line.slice(i), 'comment');
        return { tokens, nextMode: 'block-comment' };
      }
      pushToken(tokens, line.slice(i, closeIdx + 2), 'comment');
      i = closeIdx + 2;
      continue;
    }
    if (ch === '/' && next === '/') {
      pushToken(tokens, line.slice(i), 'comment');
      break;
    }
    if (ch === '{') {
      pushToken(tokens, '{', 'operator');
      curMode = 'css-rule-body';
      i++;
      continue;
    }
    if (ch === '}') {
      pushToken(tokens, '}', 'operator');
      curMode = 'normal';
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const end = consumeQuotedString(line, i, ch);
      pushToken(tokens, line.slice(i, end), 'string');
      i = end;
      continue;
    }

    // @media, @keyframes, @layer, !important
    if (ch === '@' && /[A-Za-z-]/.test(next || '')) {
      const m = /^@[\w-]+/.exec(line.slice(i));
      if (m) {
        pushToken(tokens, m[0], 'keyword');
        i += m[0].length;
        continue;
      }
    }
    if (line.startsWith('!important', i)) {
      pushToken(tokens, '!important', 'keyword');
      i += 10;
      continue;
    }

    // Variáveis SCSS ($primary) ou CSS (--radius)
    if ((ch === '$' && /[A-Za-z_]/.test(next || '')) || (ch === '-' && next === '-' && /[A-Za-z]/.test(line[i + 2] || ''))) {
      const m = /^(?:\$[\w-]+|--[\w-]+)/.exec(line.slice(i));
      if (m) {
        pushToken(tokens, m[0], 'decorator');
        i += m[0].length;
        continue;
      }
    }

    if (curMode === 'css-rule-body' || inRule) {
      // Nome da propriedade CSS antes de ':'
      const propMatch = /^([a-zA-Z-][\w-]*)(\s*:)/.exec(line.slice(i));
      if (propMatch && tokens.every((t) => t.kind === 'plain' || t.kind === 'comment' || t.text === '{')) {
        pushToken(tokens, propMatch[1], 'property');
        pushToken(tokens, propMatch[2], 'operator');
        i += propMatch[0].length;
        continue;
      }

      // Cores hexadecimais (#0f172a, #fff)
      if (ch === '#') {
        const hexMatch = /^#[0-9a-fA-F]{3,8}\b/.exec(line.slice(i));
        if (hexMatch) {
          pushToken(tokens, hexMatch[0], 'number');
          i += hexMatch[0].length;
          continue;
        }
      }

      // Números e unidades CSS (16px, 1.5rem, 100%, 0.2s, 360deg)
      if (/\d/.test(ch) || (ch === '-' && /\d/.test(next || '')) || (ch === '.' && /\d/.test(next || ''))) {
        const unitMatch = /^-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|vh|vw|dvh|%|s|ms|deg|fr|ch)?/.exec(line.slice(i));
        if (unitMatch) {
          pushToken(tokens, unitMatch[0], 'number');
          i += unitMatch[0].length;
          continue;
        }
      }

      const wordMatch = /^[a-zA-Z_][\w-]*/.exec(line.slice(i));
      if (wordMatch) {
        const w = wordMatch[0];
        if (line[i + w.length] === '(') {
          pushToken(tokens, w, 'function');
        } else if (CSS_VALUE_KEYWORDS.has(w)) {
          pushToken(tokens, w, 'constant');
        } else {
          pushToken(tokens, w, 'plain');
        }
        i += w.length;
        continue;
      }
    } else {
      // Seletores CSS (.toolbar, #hero, :hover, ::before, section)
      const pseudoMatch = /^::?[\w-]+/.exec(line.slice(i));
      if (pseudoMatch) {
        pushToken(tokens, pseudoMatch[0], 'decorator');
        i += pseudoMatch[0].length;
        continue;
      }
      const selMatch = /^[.#]?[a-zA-Z_][\w-]*/.exec(line.slice(i));
      if (selMatch) {
        pushToken(tokens, selMatch[0], 'tag');
        i += selMatch[0].length;
        continue;
      }
    }

    pushToken(tokens, ch, /[(),:;>+~*=[\]]/.test(ch) ? 'operator' : 'plain');
    i++;
  }

  return { tokens: tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }], nextMode: curMode };
}

function tokenizeJsonLine(line: string): CodeSyntaxToken[] {
  if (!line) return [{ text: '', kind: 'plain' }];
  const tokens: CodeSyntaxToken[] = [];
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (ch === ' ' || ch === '\t') {
      pushToken(tokens, ch, 'plain');
      i++;
      continue;
    }
    if (ch === '"') {
      const end = consumeQuotedString(line, i, '"');
      const isKey = /^\s*:/.test(line.slice(end));
      pushToken(tokens, line.slice(i, end), isKey ? 'property' : 'string');
      i = end;
      continue;
    }
    if (ch === '-' || /\d/.test(ch)) {
      const numMatch = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(line.slice(i));
      if (numMatch) {
        pushToken(tokens, numMatch[0], 'number');
        i += numMatch[0].length;
        continue;
      }
    }
    const wordMatch = /^(?:true|false|null)\b/.exec(line.slice(i));
    if (wordMatch) {
      pushToken(tokens, wordMatch[0], 'constant');
      i += wordMatch[0].length;
      continue;
    }
    pushToken(tokens, ch, /[{}[\]:,]/.test(ch) ? 'operator' : 'plain');
    i++;
  }

  return tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }];
}

function tokenizeYamlLine(line: string): CodeSyntaxToken[] {
  if (!line) return [{ text: '', kind: 'plain' }];
  if (/^\s*#/.test(line)) return [{ text: line, kind: 'comment' }];
  if (/^---\s*$/.test(line) || /^\.\.\.\s*$/.test(line)) return [{ text: line, kind: 'operator' }];

  const tokens: CodeSyntaxToken[] = [];
  let rest = line;

  // Comentário inline precedido por espaço
  let trailingComment = '';
  const inlineHash = /(\s+#.*)$/.exec(rest);
  if (inlineHash && !rest.slice(0, inlineHash.index).includes('"') && !rest.slice(0, inlineHash.index).includes("'")) {
    trailingComment = inlineHash[1];
    rest = rest.slice(0, inlineHash.index);
  }

  const keyMatch = /^(\s*(?:-\s+)?)([\w./-]+|"[^"]+"|'[^']+')(\s*:)(\s*.*)$/.exec(rest);
  if (keyMatch) {
    const [, prefix, key, colon, valuePart] = keyMatch;
    if (prefix) {
      const dashIdx = prefix.indexOf('-');
      if (dashIdx !== -1) {
        pushToken(tokens, prefix.slice(0, dashIdx), 'plain');
        pushToken(tokens, '-', 'operator');
        pushToken(tokens, prefix.slice(dashIdx + 1), 'plain');
      } else {
        pushToken(tokens, prefix, 'plain');
      }
    }
    pushToken(tokens, key, 'property');
    pushToken(tokens, colon, 'operator');
    tokenizeYamlScalar(valuePart, tokens);
  } else {
    const listMatch = /^(\s*-\s+)(.*)$/.exec(rest);
    if (listMatch) {
      const dashIdx = listMatch[1].indexOf('-');
      pushToken(tokens, listMatch[1].slice(0, dashIdx), 'plain');
      pushToken(tokens, '-', 'operator');
      pushToken(tokens, listMatch[1].slice(dashIdx + 1), 'plain');
      tokenizeYamlScalar(listMatch[2], tokens);
    } else {
      tokenizeYamlScalar(rest, tokens);
    }
  }

  if (trailingComment) pushToken(tokens, trailingComment, 'comment');
  return tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }];
}

function tokenizeYamlScalar(raw: string, tokens: CodeSyntaxToken[]): void {
  if (!raw) return;
  const wsMatch = /^(\s*)(.*)$/.exec(raw);
  if (!wsMatch) return;
  const [, ws, val] = wsMatch;
  pushToken(tokens, ws, 'plain');
  if (!val) return;

  if (/^(?:true|false|null|~|yes|no|on|off)$/i.test(val)) {
    pushToken(tokens, val, 'constant');
  } else if (/^-?\d+(?:\.\d+)?$/.test(val)) {
    pushToken(tokens, val, 'number');
  } else if (val.startsWith('&') || val.startsWith('*')) {
    pushToken(tokens, val, 'decorator');
  } else if (val.startsWith('[') || val.startsWith('{')) {
    for (const t of tokenizeJsonLine(val)) pushToken(tokens, t.text, t.kind);
  } else {
    pushToken(tokens, val, 'string');
  }
}

function tokenizeSqlLine(
  line: string,
  mode: BlockMode
): { tokens: CodeSyntaxToken[]; nextMode: BlockMode } {
  if (!line) return { tokens: [{ text: '', kind: 'plain' }], nextMode: mode };
  const tokens: CodeSyntaxToken[] = [];
  let i = 0;
  let curMode = mode;

  if (curMode === 'block-comment') {
    const closeIdx = line.indexOf('*/');
    if (closeIdx === -1) {
      return { tokens: [{ text: line, kind: 'comment' }], nextMode: 'block-comment' };
    }
    pushToken(tokens, line.slice(0, closeIdx + 2), 'comment');
    i = closeIdx + 2;
    curMode = 'normal';
  }

  let prevChar = '';
  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === ' ' || ch === '\t') {
      pushToken(tokens, ch, 'plain');
      i++;
      continue;
    }
    if (ch === '-' && next === '-') {
      pushToken(tokens, line.slice(i), 'comment');
      break;
    }
    if (ch === '/' && next === '*') {
      const closeIdx = line.indexOf('*/', i + 2);
      if (closeIdx === -1) {
        pushToken(tokens, line.slice(i), 'comment');
        curMode = 'block-comment';
        break;
      }
      pushToken(tokens, line.slice(i, closeIdx + 2), 'comment');
      i = closeIdx + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const end = consumeQuotedString(line, i, ch);
      pushToken(tokens, line.slice(i, end), ch === '"' ? 'property' : 'string');
      prevChar = ch;
      i = end;
      continue;
    }
    if ((ch === '$' || ch === ':' || ch === '@') && /[\w]/.test(next || '')) {
      const pMatch = /^[$:@]\w+/.exec(line.slice(i));
      if (pMatch) {
        pushToken(tokens, pMatch[0], 'decorator');
        i += pMatch[0].length;
        continue;
      }
    }
    if (/\d/.test(ch)) {
      const nMatch = /^\d+(?:\.\d+)?/.exec(line.slice(i));
      if (nMatch) {
        pushToken(tokens, nMatch[0], 'number');
        i += nMatch[0].length;
        prevChar = '0';
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch)) {
      const wMatch = /^[A-Za-z_]\w*/.exec(line.slice(i))!;
      const word = wMatch[0];
      const upper = word.toUpperCase();
      const isCall = /^\s*\(/.test(line.slice(i + word.length));

      if (prevChar === '.') {
        pushToken(tokens, word, 'property');
      } else if (upper === 'TRUE' || upper === 'FALSE' || upper === 'NULL') {
        pushToken(tokens, word, 'constant');
      } else if (SQL_FUNCTIONS.has(upper) && isCall) {
        pushToken(tokens, word, 'function');
      } else if (SQL_KEYWORDS.has(upper)) {
        pushToken(tokens, word, 'keyword');
      } else if (SQL_TYPES.has(upper)) {
        pushToken(tokens, word, 'type');
      } else if (isCall) {
        pushToken(tokens, word, 'function');
      } else {
        pushToken(tokens, word, 'plain');
      }
      prevChar = 'w';
      i += word.length;
      continue;
    }

    pushToken(tokens, ch, /[=<>!+\-*/(),.;]/.test(ch) ? 'operator' : 'plain');
    prevChar = ch;
    i++;
  }

  return { tokens: tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }], nextMode: curMode };
}

function tokenizeShellOrDockerLine(line: string, isDocker: boolean): CodeSyntaxToken[] {
  if (!line) return [{ text: '', kind: 'plain' }];
  if (/^\s*#/.test(line)) {
    return [{ text: line, kind: line.startsWith('#!') ? 'decorator' : 'comment' }];
  }

  const tokens: CodeSyntaxToken[] = [];
  let i = 0;
  let atCommandStart = true;

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === ' ' || ch === '\t') {
      pushToken(tokens, ch, 'plain');
      i++;
      continue;
    }
    if (ch === '#' && (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t')) {
      pushToken(tokens, line.slice(i), 'comment');
      break;
    }
    if (ch === '"' || ch === "'") {
      const end = consumeQuotedString(line, i, ch);
      pushToken(tokens, line.slice(i, end), 'string');
      atCommandStart = false;
      i = end;
      continue;
    }
    if (ch === '$') {
      const varMatch = /^\$(?:\{[^}]+\}|env:[\w]+|[\w?@#*$!]+)/i.exec(line.slice(i));
      if (varMatch) {
        pushToken(tokens, varMatch[0], 'decorator');
        atCommandStart = false;
        i += varMatch[0].length;
        continue;
      }
    }
    // Flags de CLI (--production, --from=builder, -rf)
    if (ch === '-' && /[A-Za-z-]/.test(next || '') && (i === 0 || line[i - 1] === ' ')) {
      const flagMatch = /^--?[\w-]+(?:=[^\s]+)?/.exec(line.slice(i));
      if (flagMatch) {
        pushToken(tokens, flagMatch[0], isDocker ? 'decorator' : 'property');
        atCommandStart = false;
        i += flagMatch[0].length;
        continue;
      }
    }
    if (/\d/.test(ch) && (i === 0 || !/\w/.test(line[i - 1]))) {
      const numMatch = /^\d+(?:\.\d+)?/.exec(line.slice(i));
      if (numMatch && !/[A-Za-z/-]/.test(line[i + numMatch[0].length] || '')) {
        pushToken(tokens, numMatch[0], 'number');
        atCommandStart = false;
        i += numMatch[0].length;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch)) {
      const wordMatch = /^[A-Za-z_][\w-]*/.exec(line.slice(i))!;
      const word = wordMatch[0];
      const upper = word.toUpperCase();

      if (isDocker && DOCKER_KEYWORDS.has(upper) && (atCommandStart || upper === 'AS')) {
        pushToken(tokens, word, 'keyword');
        atCommandStart = false;
      } else if (!isDocker && line[i + word.length] === '=') {
        pushToken(tokens, word, 'property');
        atCommandStart = false;
      } else if (!isDocker && SHELL_KEYWORDS.has(word)) {
        pushToken(tokens, word, 'keyword');
        atCommandStart = word === 'then' || word === 'do' || word === 'else';
      } else if (!isDocker && (SHELL_COMMANDS.has(word) || atCommandStart)) {
        pushToken(tokens, word, SHELL_COMMANDS.has(word) ? 'function' : 'plain');
        atCommandStart = false;
      } else {
        pushToken(tokens, word, 'plain');
        atCommandStart = false;
      }
      i += word.length;
      continue;
    }
    if (line.startsWith('&&', i) || line.startsWith('||', i)) {
      pushToken(tokens, line.slice(i, i + 2), 'operator');
      atCommandStart = true;
      i += 2;
      continue;
    }
    if (ch === '|' || ch === ';') {
      pushToken(tokens, ch, 'operator');
      atCommandStart = true;
      i++;
      continue;
    }
    pushToken(tokens, ch, /[=<>[\]{}()]/.test(ch) ? 'operator' : 'plain');
    i++;
  }

  return tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }];
}

function tokenizeGraphqlOrPrismaLine(line: string, isPrisma: boolean): CodeSyntaxToken[] {
  if (!line) return [{ text: '', kind: 'plain' }];
  const tokens: CodeSyntaxToken[] = [];
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === ' ' || ch === '\t') {
      pushToken(tokens, ch, 'plain');
      i++;
      continue;
    }
    if ((!isPrisma && ch === '#') || (isPrisma && ch === '/' && next === '/')) {
      pushToken(tokens, line.slice(i), 'comment');
      break;
    }
    if (ch === '"') {
      const end = consumeQuotedString(line, i, '"');
      pushToken(tokens, line.slice(i, end), 'string');
      i = end;
      continue;
    }
    if (ch === '@' && /[@A-Za-z_]/.test(next || '')) {
      const dirMatch = /^@@?[A-Za-z_][\w.]*/.exec(line.slice(i));
      if (dirMatch) {
        pushToken(tokens, dirMatch[0], 'decorator');
        i += dirMatch[0].length;
        continue;
      }
    }
    if (ch === '$' && /[A-Za-z_]/.test(next || '')) {
      const varMatch = /^\$[A-Za-z_]\w*/.exec(line.slice(i));
      if (varMatch) {
        pushToken(tokens, varMatch[0], 'decorator');
        i += varMatch[0].length;
        continue;
      }
    }
    if (/\d/.test(ch)) {
      const numMatch = /^\d+(?:\.\d+)?/.exec(line.slice(i));
      if (numMatch) {
        pushToken(tokens, numMatch[0], 'number');
        i += numMatch[0].length;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch)) {
      const wMatch = /^[A-Za-z_]\w*/.exec(line.slice(i))!;
      const word = wMatch[0];
      const after = line.slice(i + word.length);
      if (word === 'true' || word === 'false' || word === 'null') {
        pushToken(tokens, word, 'constant');
      } else if (GRAPHQL_PRISMA_KEYWORDS.has(word)) {
        pushToken(tokens, word, 'keyword');
      } else if (GRAPHQL_PRISMA_TYPES.has(word) || /^[A-Z]/.test(word)) {
        pushToken(tokens, word, 'type');
      } else if (/^\s*\(/.test(after)) {
        pushToken(tokens, word, 'function');
      } else if (/^\s*:/.test(after) || isPrisma) {
        pushToken(tokens, word, 'property');
      } else {
        pushToken(tokens, word, 'plain');
      }
      i += word.length;
      continue;
    }

    pushToken(tokens, ch, /[:!=()[\]{}?]/.test(ch) ? 'operator' : 'plain');
    i++;
  }

  return tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }];
}

function tokenizeMarkdownLine(
  line: string,
  mode: BlockMode,
  resolveLanguage: (raw?: string) => string
): { tokens: CodeSyntaxToken[]; nextMode: BlockMode } {
  if (!line) return { tokens: [{ text: '', kind: 'plain' }], nextMode: mode };

  const fenceMatch = /^(\s*```+)([\w#+.-]*)(.*)$/.exec(line);
  if (fenceMatch) {
    if (typeof mode === 'object' && 'fencedLang' in mode) {
      return { tokens: [{ text: line, kind: 'decorator' }], nextMode: 'normal' };
    }
    const innerLang = fenceMatch[2] ? resolveLanguage(fenceMatch[2]) : 'plaintext';
    return {
      tokens: [
        { text: fenceMatch[1], kind: 'decorator' },
        ...(fenceMatch[2] ? [{ text: fenceMatch[2], kind: 'type' as CodeTokenKind }] : []),
        ...(fenceMatch[3] ? [{ text: fenceMatch[3], kind: 'plain' as CodeTokenKind }] : []),
      ],
      nextMode: { fencedLang: innerLang },
    };
  }

  if (typeof mode === 'object' && 'fencedLang' in mode) {
    return {
      tokens: tokenizeSingleLineWithMode(line, mode.fencedLang, 'normal', resolveLanguage).tokens,
      nextMode: mode,
    };
  }

  if (/^#{1,6}\s/.test(line)) {
    return { tokens: [{ text: line, kind: 'heading' }], nextMode: mode };
  }
  if (/^\s*>\s?/.test(line)) {
    return { tokens: [{ text: line, kind: 'comment' }], nextMode: mode };
  }

  const tokens: CodeSyntaxToken[] = [];
  let i = 0;

  const listMatch = /^(\s*(?:[-*+]|\d+\.)\s+)(\[[ xX]\]\s+)?/.exec(line);
  if (listMatch) {
    pushToken(tokens, listMatch[1], 'keyword');
    if (listMatch[2]) pushToken(tokens, listMatch[2], 'constant');
    i = listMatch[0].length;
  }

  while (i < line.length) {
    if (line[i] === '`') {
      const close = line.indexOf('`', i + 1);
      if (close !== -1) {
        pushToken(tokens, line.slice(i, close + 1), 'string');
        i = close + 1;
        continue;
      }
    }
    if (line.startsWith('**', i)) {
      const close = line.indexOf('**', i + 2);
      if (close !== -1) {
        pushToken(tokens, line.slice(i, close + 2), 'heading');
        i = close + 2;
        continue;
      }
    }
    if (line[i] === '[') {
      const linkMatch = /^(\[[^\]]+\])(\([^)]+\))/.exec(line.slice(i));
      if (linkMatch) {
        pushToken(tokens, linkMatch[1], 'property');
        pushToken(tokens, linkMatch[2], 'string');
        i += linkMatch[0].length;
        continue;
      }
    }
    pushToken(tokens, line[i], 'plain');
    i++;
  }

  return { tokens: tokens.length > 0 ? tokens : [{ text: line, kind: 'plain' }], nextMode: mode };
}

function tokenizeSingleLineWithMode(
  line: string,
  normalizedLang: string,
  mode: BlockMode,
  resolveLanguage: (raw?: string) => string
): { tokens: CodeSyntaxToken[]; nextMode: BlockMode } {
  if (normalizedLang === 'plaintext') {
    return { tokens: [{ text: line, kind: 'plain' }], nextMode: 'normal' };
  }
  if (normalizedLang === 'markdown') {
    return tokenizeMarkdownLine(line, mode, resolveLanguage);
  }
  if (normalizedLang === 'html' || normalizedLang === 'xml') {
    return tokenizeMarkupLine(line, mode);
  }
  if (normalizedLang === 'css') {
    return tokenizeCssLine(line, mode);
  }
  if (normalizedLang === 'json') {
    return { tokens: tokenizeJsonLine(line), nextMode: 'normal' };
  }
  if (normalizedLang === 'yaml') {
    return { tokens: tokenizeYamlLine(line), nextMode: 'normal' };
  }
  if (normalizedLang === 'sql') {
    return tokenizeSqlLine(line, mode);
  }
  if (normalizedLang === 'dockerfile') {
    return { tokens: tokenizeShellOrDockerLine(line, true), nextMode: 'normal' };
  }
  if (normalizedLang === 'bash' || normalizedLang === 'powershell') {
    return { tokens: tokenizeShellOrDockerLine(line, false), nextMode: 'normal' };
  }
  if (normalizedLang === 'graphql' || normalizedLang === 'prisma') {
    return { tokens: tokenizeGraphqlOrPrismaLine(line, normalizedLang === 'prisma'), nextMode: 'normal' };
  }

  const profile = GRAMMAR_PROFILES[normalizedLang] || GRAMMAR_PROFILES.typescript;
  return tokenizeGeneralCodeLine(line, profile, mode);
}

export function tokenizeCodeBlockLines(
  lines: ReadonlyArray<string>,
  normalizedLang: string,
  resolveLanguage: (raw?: string) => string
): CodeSyntaxToken[][] {
  let mode: BlockMode = 'normal';
  return lines.map((line) => {
    const res = tokenizeSingleLineWithMode(line, normalizedLang, mode, resolveLanguage);
    mode = res.nextMode;
    return res.tokens;
  });
}

export function tokenizeSingleCodeLine(
  line: string,
  normalizedLang: string,
  resolveLanguage: (raw?: string) => string
): CodeSyntaxToken[] {
  return tokenizeSingleLineWithMode(line, normalizedLang, 'normal', resolveLanguage).tokens;
}

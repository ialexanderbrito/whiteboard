import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allRunsHaveFormat,
  applyLinkToRuns,
  deriveLinksFromRuns,
  getElementRuns,
  layoutRichText,
  normalizeColor,
  removeRunLink,
  runsToHtml,
  runsToPlainText,
  setAllRunsColor,
  setAllRunsLink,
  toggleAllRunsFormat,
  updateRunLink,
} from '../src/utils/richText.ts';

const baseElement = {
  id: 'el-1',
  type: 'text',
  x: 0,
  y: 0,
  width: 240,
  text: 'Olá mundo',
};

test('normalizeColor: converte rgb/rgba em hex e preserva hex', () => {
  assert.equal(normalizeColor('rgb(15, 23, 42)'), '#0f172a');
  assert.equal(normalizeColor('rgba(239, 68, 68, 0.8)'), '#ef4444');
  assert.equal(normalizeColor('#f59e0b'), '#f59e0b');
  assert.equal(normalizeColor(''), undefined);
  assert.equal(normalizeColor(undefined), undefined);
});

test('getElementRuns: elementos antigos herdam a tipografia global', () => {
  const runs = getElementRuns({
    ...baseElement,
    fontWeight: 'bold',
    fontStyle: 'italic',
    textDecoration: 'underline line-through',
    fill: '#0f172a',
  });

  assert.equal(runs.length, 1);
  assert.deepEqual(runs[0], {
    text: 'Olá mundo',
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    color: '#0f172a',
    url: undefined,
  });
});

test('getElementRuns: links legados (markdown/URL) viram runs clicáveis', () => {
  const runs = getElementRuns({
    ...baseElement,
    text: 'Acesse [o site](https://mirio.app) agora',
  });

  const linkRun = runs.find((run) => run.url);
  assert.ok(linkRun);
  assert.equal(linkRun.text, 'o site');
  assert.equal(linkRun.url, 'https://mirio.app');
});

test('getElementRuns: richText tem prioridade e mantém formatação por trecho', () => {
  const runs = getElementRuns({
    ...baseElement,
    fontWeight: 'bold',
    textColor: '#111827',
    richText: [
      { text: 'Normal ' },
      { text: 'forte', bold: true, italic: true, color: '#ef4444' },
      { text: ' link', url: 'mirio.app', underline: true },
    ],
  });

  assert.equal(runs.length, 3);
  assert.equal(runs[0].bold, true); // herda a tipografia global
  assert.equal(runs[0].color, undefined); // sem cor própria: usa a base no render
  assert.equal(runs[1].bold, true);
  assert.equal(runs[1].italic, true);
  assert.equal(runs[1].color, '#ef4444');
  assert.equal(runs[2].url, 'https://mirio.app');
});

test('runsToPlainText: reconstrói o texto sem HTML', () => {
  assert.equal(
    runsToPlainText([
      { text: 'Olá ' },
      { text: 'mundo', bold: true },
      { text: '\nlinha 2' },
    ]),
    'Olá mundo\nlinha 2'
  );
});

test('deriveLinksFromRuns: extrai links únicos e usa o trecho como label', () => {
  const { linkUrl, links } = deriveLinksFromRuns([
    { text: 'Mirio', url: 'mirio.app' },
    { text: ' e ' },
    { text: 'Docs', url: 'https://docs.mirio.app' },
    { text: ' de novo', url: 'https://mirio.app' },
  ]);

  assert.equal(linkUrl, 'https://mirio.app');
  assert.deepEqual(links, [
    { url: 'https://mirio.app', label: 'Mirio' },
    { url: 'https://docs.mirio.app', label: 'Docs' },
  ]);
});

test('updateRunLink: altera apenas o link alvo e preserva os demais', () => {
  const runs = [
    { text: 'A', url: 'https://a.com' },
    { text: 'B', url: 'https://b.com' },
    { text: 'C' },
  ];

  const updated = updateRunLink(runs, 'https://a.com', 'https://novo.com');
  assert.equal(updated[0].url, 'https://novo.com');
  assert.equal(updated[1].url, 'https://b.com');
  assert.equal(updated[2].url, undefined);
  // Imutabilidade: a lista original não é alterada
  assert.equal(runs[0].url, 'https://a.com');
});

test('updateRunLink: sem oldUrl aplica a todos os trechos com link', () => {
  const updated = updateRunLink(
    [
      { text: 'A', url: 'https://a.com' },
      { text: 'B' },
    ],
    undefined,
    'https://novo.com'
  );

  assert.equal(updated[0].url, 'https://novo.com');
  assert.equal(updated[1].url, undefined);
});

test('removeRunLink: remove um link específico ou todos', () => {
  const runs = [
    { text: 'A', url: 'https://a.com' },
    { text: 'B', url: 'https://b.com' },
  ];

  const onlyA = removeRunLink(runs, 'https://a.com');
  assert.equal(onlyA[0].url, undefined);
  assert.equal(onlyA[1].url, 'https://b.com');

  const none = removeRunLink(runs);
  assert.equal(none[0].url, undefined);
  assert.equal(none[1].url, undefined);
});

test('setAllRunsLink: aplica o link do elemento inteiro a todos os trechos', () => {
  const runs = setAllRunsLink([{ text: 'A' }, { text: 'B', bold: true }], 'mirio.app');
  assert.equal(runs[0].url, 'https://mirio.app');
  assert.equal(runs[1].url, 'https://mirio.app');
  assert.equal(runs[1].bold, true);
});

test('toggleAllRunsFormat / setAllRunsColor / allRunsHaveFormat', () => {
  const runs = [{ text: 'A', bold: false }, { text: 'B', bold: false }];

  const bolded = toggleAllRunsFormat(runs, 'bold', true);
  assert.ok(bolded.every((run) => run.bold === true));
  assert.ok(allRunsHaveFormat(bolded, 'bold'));
  assert.equal(allRunsHaveFormat(runs, 'bold'), false);

  const colored = setAllRunsColor(bolded, 'rgb(239, 68, 68)');
  assert.ok(colored.every((run) => run.color === '#ef4444'));

  const cleared = setAllRunsColor(colored, undefined);
  assert.ok(cleared.every((run) => run.color === undefined));
  // A chave é removida (e não gravada como undefined) para o Firestore aceitar.
  assert.ok(cleared.every((run) => !('color' in run)));
});

test('removeRunLink: remove a chave url em vez de gravar undefined', () => {
  const runs = removeRunLink([{ text: 'A', url: 'https://a.com', bold: true }], 'https://a.com');
  assert.equal(runs[0].url, undefined);
  assert.ok(!('url' in runs[0]));
  assert.equal(runs[0].bold, true);
});

test('layoutRichText: palavras maiores que a largura quebram por caractere', () => {
  const layout = layoutRichText(
    [
      {
        text: 'https://exemplo.com/caminho/muito/longo/sem-espacos',
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
      },
    ],
    { maxWidth: 100, fontSize: 20, baseColor: '#0f172a' }
  );

  assert.ok(layout.lineCount > 1);
  for (const token of layout.tokens) {
    assert.ok(token.x >= 0);
    assert.ok(token.x + token.width <= 101, `token "${token.text}" estourou a largura`);
  }
  // O texto é preservado por completo, apenas redistribuído em linhas.
  assert.equal(layout.tokens.map((token) => token.text).join(''), 'https://exemplo.com/caminho/muito/longo/sem-espacos');
});

test('layoutRichText: linhas com quebra explícita mantêm a altura', () => {
  const layout = layoutRichText(
    [
      {
        text: 'linha 1\nlinha 2',
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
      },
    ],
    { maxWidth: 400, fontSize: 20, baseColor: '#0f172a' }
  );

  assert.equal(layout.lineCount, 2);
  assert.ok(layout.tokens.some((token) => token.y > 0));
});

test('runsToHtml: usa tags semânticas (b, i, u, s, a) compatíveis com execCommand', () => {
  const html = runsToHtml([
    { text: 'Normal ' },
    { text: 'Negrito', bold: true, underline: true, color: '#ef4444' },
    { text: ' Link', url: 'https://mirio.app', italic: true, strikethrough: true },
  ]);

  assert.ok(html.includes('<b>'));
  assert.ok(html.includes('<u>'));
  assert.ok(html.includes('<i>'));
  assert.ok(html.includes('<s>'));
  assert.ok(html.includes('style="color:#ef4444"'));
  assert.ok(html.includes('<a href="https://mirio.app" data-mirio-link="true">'));
});

test('applyLinkToRuns: vincula apenas o rótulo correspondente ou preserva links existentes', () => {
  const runs = [
    { text: 'Visite o Mirio ou veja a documentação', bold: false },
  ];

  const withSpecificLabel = applyLinkToRuns(runs, 'mirio.app', 'Mirio');
  assert.equal(runsToPlainText(withSpecificLabel), 'Visite o Mirio ou veja a documentação');
  const linkedRun = withSpecificLabel.find((r) => r.text === 'Mirio');
  assert.ok(linkedRun);
  assert.equal(linkedRun.url, 'https://mirio.app');
  assert.equal(withSpecificLabel[0].url, undefined);

  // Adicionar segundo link sem sobrescrever o primeiro
  const withSecondLink = applyLinkToRuns(withSpecificLabel, 'docs.mirio.app', 'documentação');
  assert.equal(withSecondLink.find((r) => r.text === 'Mirio')?.url, 'https://mirio.app');
  assert.equal(withSecondLink.find((r) => r.text === 'documentação')?.url, 'https://docs.mirio.app');

  // Rótulo novo que não existe no texto é anexado ao final
  const appended = applyLinkToRuns(withSecondLink, 'status.mirio.app', 'Status');
  assert.ok(runsToPlainText(appended).endsWith(' Status'));
  assert.equal(appended[appended.length - 1].url, 'https://status.mirio.app');
});

test('updateRunLink: permite atualizar tanto a URL quanto o texto do rótulo', () => {
  const runs = [
    { text: 'Texto antes ' },
    { text: 'Antigo', url: 'https://antigo.com', bold: true },
  ];

  const updated = updateRunLink(runs, 'https://antigo.com', 'https://novo.com', 'Novo Rótulo');
  assert.equal(updated[1].url, 'https://novo.com');
  assert.equal(updated[1].text, 'Novo Rótulo');
  assert.equal(updated[1].bold, true);
});


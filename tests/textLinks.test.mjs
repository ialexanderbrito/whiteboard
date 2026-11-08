import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  normalizeUrl, 
  getDomainFromUrl, 
  stripMarkdownLinks, 
  parseTextSegments, 
  extractLinksFromText,
  getFirstLink, 
  extractAllLinks,
  removeLinkFromText,
  updateLinkInText,
  insertMarkdownLink,
  applyLinkToText,
  addLinkToElement,
  removeLinkFromElement,
  layoutFormattedWords
} from '../src/utils/textLinks.ts';

test('normalizeUrl: adiciona protocolo https se ausente', () => {
  assert.equal(normalizeUrl('google.com'), 'https://google.com');
  assert.equal(normalizeUrl('http://insecure.site'), 'http://insecure.site');
  assert.equal(normalizeUrl('https://secure.site/path?q=1'), 'https://secure.site/path?q=1');
  assert.equal(normalizeUrl('   github.com/repo   '), 'https://github.com/repo');
});

test('getDomainFromUrl: extrai o domínio limpo para badges e prévias', () => {
  assert.equal(getDomainFromUrl('https://www.google.com/search'), 'google.com');
  assert.equal(getDomainFromUrl('https://miro.com/app/board/123/'), 'miro.com');
  assert.equal(getDomainFromUrl('github.com/alexander'), 'github.com');
});

test('stripMarkdownLinks: remove a sintaxe de colchetes preservando o texto', () => {
  const markdown = 'Acesse o [Google](https://google.com) para mais [informações](https://info.org).';
  assert.equal(stripMarkdownLinks(markdown), 'Acesse o Google para mais informações.');
});

test('parseTextSegments: separa texto comum de hyperlinks interativos', () => {
  const text = 'Olá [Miro](https://miro.com) mundo!';
  const segments = parseTextSegments(text);

  assert.equal(segments.length, 3);
  assert.deepEqual(segments[0], { text: 'Olá ', isLink: false });
  assert.deepEqual(segments[1], { text: 'Miro', isLink: true, url: 'https://miro.com' });
  assert.deepEqual(segments[2], { text: ' mundo!', isLink: false });
});

test('extractLinksFromText: lista todos os links existentes no texto', () => {
  const text = 'Check [Doc 1](https://doc1.com) and [Doc 2](https://doc2.com)';
  const links = extractLinksFromText(text);

  assert.equal(links.length, 2);
  assert.equal(links[0].label, 'Doc 1');
  assert.equal(links[0].url, 'https://doc1.com');
  assert.equal(links[1].label, 'Doc 2');
  assert.equal(links[1].url, 'https://doc2.com');
});

test('getFirstLink: prioriza linkUrl explícito e depois extrai do texto', () => {
  assert.deepEqual(getFirstLink('texto sem link', 'miro.com'), { url: 'https://miro.com' });
  assert.deepEqual(getFirstLink('Veja [aqui](google.com)', undefined), { url: 'https://google.com', label: 'aqui' });
  assert.deepEqual(getFirstLink('Visite https://raw.link/site', undefined), { url: 'https://raw.link/site' });
  assert.equal(getFirstLink('texto comum', undefined), null);
});

test('insertMarkdownLink: formata seleção no formato [label](url)', () => {
  const original = 'Clique aqui para abrir';
  // Selecionando "aqui" (índice 7 a 11)
  const result = insertMarkdownLink(original, 7, 11, 'https://exemplo.com');

  assert.equal(result.newText, 'Clique [aqui](https://exemplo.com) para abrir');
  assert.equal(result.newCursorPos, 34);
});

test('applyLinkToText: aplica link apenas na palavra especificada na frase sem duplicar', () => {
  const frase = 'Uma vez Flamengo, sempre Flamengo';
  
  // Caso 1: usuário informou "Flamengo" ou "flamengo" como label
  const r1 = applyLinkToText(frase, 'flamengo', 'https://flamengo.com.br');
  assert.equal(r1, 'Uma vez [Flamengo](https://flamengo.com.br), sempre Flamengo');

  // Caso 2: usuário selecionou o segundo "Flamengo" (índice 25 a 33)
  const range = { start: 25, end: 33 };
  const r2 = applyLinkToText(frase, 'Flamengo', 'https://flamengo.com.br', range);
  assert.equal(r2, 'Uma vez Flamengo, sempre [Flamengo](https://flamengo.com.br)');

  // Caso 3: texto vazio
  const r3 = applyLinkToText('', 'Flamengo', 'flamengo.com.br');
  assert.equal(r3, '[Flamengo](https://flamengo.com.br)');

  // Caso 4: palavra não existe na frase (deve anexar)
  const r4 = applyLinkToText('Texto qualquer', 'Site', 'https://site.com');
  assert.equal(r4, 'Texto qualquer [Site](https://site.com)');

  // Caso 5: edição de link existente (atualiza URL)
  const fraseComLink = 'Uma vez [Flamengo](https://old.com), sempre Flamengo';
  const r5 = applyLinkToText(fraseComLink, 'Flamengo', 'https://flamengo.com.br');
  assert.equal(r5, 'Uma vez [Flamengo](https://flamengo.com.br), sempre Flamengo');
});

test('extractAllLinks: extrai múltiplos links em ordem sem duplicação', () => {
  const text = 'Tarefas:\n- [Figma](https://figma.com/file)\n- [GitHub](https://github.com/repo)\n- Visite https://google.com';
  const all = extractAllLinks(text, undefined);

  assert.equal(all.length, 3);
  assert.equal(all[0].label, 'Figma');
  assert.equal(all[0].url, 'https://figma.com/file');
  assert.equal(all[1].label, 'GitHub');
  assert.equal(all[1].url, 'https://github.com/repo');
  assert.equal(all[2].url, 'https://google.com');
});

test('removeLinkFromText: desfaz apenas o link especificado mantendo a palavra', () => {
  const text = 'Acesse [Flamengo](https://flamengo.com.br) e [Globo](https://globo.com)';
  const result = removeLinkFromText(text, 'https://flamengo.com.br');
  assert.equal(result, 'Acesse Flamengo e [Globo](https://globo.com)');
});

test('updateLinkInText: atualiza apenas a URL/label do link alvo', () => {
  const text = 'Acesse [Flamengo](https://flamengo.com.br) e [Globo](https://globo.com)';
  const result = updateLinkInText(text, 'https://flamengo.com.br', 'https://crflamengo.com', 'Mengo');
  assert.equal(result, 'Acesse [Mengo](https://crflamengo.com) e [Globo](https://globo.com)');
});

test('addLinkToElement: adiciona e atualiza links estruturados sem poluir texto com markdown', () => {
  const r1 = addLinkToElement(undefined, [], 'https://flamengo.com.br', 'Flamengo');
  assert.equal(r1.linkUrl, 'https://flamengo.com.br');
  assert.equal(r1.links.length, 1);
  assert.equal(r1.links[0].label, 'Flamengo');

  const r2 = addLinkToElement(r1.linkUrl, r1.links, 'https://globo.com', 'Globo');
  assert.equal(r2.links.length, 2);
  assert.equal(r2.links[0].url, 'https://flamengo.com.br');
  assert.equal(r2.links[1].url, 'https://globo.com');
});

test('removeLinkFromElement: remove link mantendo os demais intactos', () => {
  const initial = [
    { url: 'https://flamengo.com.br', label: 'Flamengo' },
    { url: 'https://globo.com', label: 'Globo' }
  ];
  const r = removeLinkFromElement('https://flamengo.com.br', initial, 'https://flamengo.com.br');
  assert.equal(r.links.length, 1);
  assert.equal(r.links[0].url, 'https://globo.com');
  assert.equal(r.linkUrl, 'https://globo.com');
});

test('parseTextSegments com structured links: vincula palavras específicas sem markdown', () => {
  const text = 'Uma vez Flamengo, sempre Flamengo';
  const links = [{ url: 'https://flamengo.com.br', label: 'Flamengo' }];
  const segments = parseTextSegments(text, links);

  assert.equal(segments.length, 4);
  assert.deepEqual(segments[0], { text: 'Uma vez ', isLink: false });
  assert.deepEqual(segments[1], { text: 'Flamengo', isLink: true, url: 'https://flamengo.com.br' });
  assert.deepEqual(segments[2], { text: ', sempre ', isLink: false });
  assert.deepEqual(segments[3], { text: 'Flamengo', isLink: true, url: 'https://flamengo.com.br' });
});

test('parseTextSegments com múltiplos links diferentes em um mesmo texto', () => {
  const text = 'Acesse o Google e também o YouTube para assistir';
  const links = [
    { url: 'https://google.com', label: 'Google' },
    { url: 'https://youtube.com', label: 'YouTube' }
  ];
  const segments = parseTextSegments(text, links);

  assert.equal(segments.length, 5);
  assert.deepEqual(segments[0], { text: 'Acesse o ', isLink: false });
  assert.deepEqual(segments[1], { text: 'Google', isLink: true, url: 'https://google.com' });
  assert.deepEqual(segments[2], { text: ' e também o ', isLink: false });
  assert.deepEqual(segments[3], { text: 'YouTube', isLink: true, url: 'https://youtube.com' });
  assert.deepEqual(segments[4], { text: ' para assistir', isLink: false });
});

test('layoutFormattedWords gera palavras formatadas com links clicáveis e coordenadas', () => {
  const text = 'Uma vez Flamengo, sempre Flamengo';
  const links = [{ url: 'https://flamengo.com.br', label: 'Flamengo' }];
  const words = layoutFormattedWords(text, 300, 16, 'normal', 'left', 1.35, links);

  assert.ok(words.length >= 3);
  const linkWords = words.filter((w) => w.isLink);
  assert.equal(linkWords.length, 2);
  assert.equal(linkWords[0].text, 'Flamengo');
  assert.equal(linkWords[0].url, 'https://flamengo.com.br');
  assert.equal(linkWords[1].text, 'Flamengo');
  assert.equal(linkWords[1].url, 'https://flamengo.com.br');
});

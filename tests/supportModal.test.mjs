import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('BuyMeACoffeeModal: implements minimal, cohesive presets and anchor', () => {
  const src = readSource('src/components/layout/BuyMeACoffeeModal.tsx');

  // Presets minimalistas
  assert.match(src, /label:\s*'R\$ 5'/);
  assert.match(src, /label:\s*'R\$ 15'/);
  assert.match(src, /label:\s*'R\$ 30'/);
  assert.match(src, /label:\s*'Livre'/);

  // Valor inicial default R$ 15
  assert.match(src, /useState<number\s*\|\s*undefined>\(15\)/);

  // Modal contido e minimalista (max-w-[320px])
  assert.match(src, /max-w-\[320px\]/);
});

test('BuyMeACoffeeModal: conforms with project button standard and omits raw email display', () => {
  const src = readSource('src/components/layout/BuyMeACoffeeModal.tsx');

  // Botão no padrão do projeto com h-8 e label direto
  assert.match(src, /Copiar código Pix/);
  assert.match(src, /Código copiado!/);
  assert.doesNotMatch(src, /Copiar Pix Copia e Cola/);

  // Não exibe texto de e-mail na interface visual
  assert.doesNotMatch(src, /Chave:\s*\{?PIX_KEY\}?/);

  // Feedback tátil com active:scale-[0.97]
  assert.match(src, /active:scale-\[0\.97\]/);

  // Transições curtas e objetivas (150ms)
  assert.match(src, /duration-150/);
});

test('BuyMeACoffeeModal: conforms with project Dialog architecture and controlled props', () => {
  const src = readSource('src/components/layout/BuyMeACoffeeModal.tsx');

  // Suporte a props controladas
  assert.match(src, /open\?:\s*boolean/);
  assert.match(src, /onOpenChange\?:\s*\(open:\s*boolean\)\s*=>\s*void/);
  assert.match(src, /hideTrigger\?:\s*boolean/);

  // Shell responsivo consistente com todos os outros modais do Mirio
  // (Dialog do Radix no desktop, bottom sheet com vaul no mobile)
  assert.match(src, /<ResponsiveModalRoot\s+open=\{open\}\s+onOpenChange=\{setOpen\}>/);
  assert.match(src, /<ResponsiveModalContent/);
});

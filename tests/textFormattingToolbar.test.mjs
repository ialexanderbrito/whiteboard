import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SelectionContextBar: compacts Bold, Italic, Underline and Strikethrough into a single button', () => {
  const componentPath = path.resolve('src/components/whiteboard/SelectionContextBar.tsx');
  assert.ok(fs.existsSync(componentPath), 'SelectionContextBar.tsx deve existir');
  const content = fs.readFileSync(componentPath, 'utf8');

  // Trigger único de formatação na barra
  assert.match(
    content,
    /aria-label="Formatação de texto"/,
    'Deve haver um botão único de trigger para Formatação de texto'
  );

  // Popover com os 4 estilos: Negrito, Itálico, Sublinhado e Riscado
  assert.match(content, /handleToggleBold/, 'Deve possuir ação de alternar negrito');
  assert.match(content, /handleToggleItalic/, 'Deve possuir ação de alternar itálico');
  assert.match(content, /handleToggleUnderline/, 'Deve possuir ação de alternar sublinhado');
  assert.match(content, /handleToggleStrikethrough/, 'Deve possuir ação de alternar riscado');

  // Emil Kowalski craft: feedback tátil e preservação de seleção de texto
  assert.match(
    content,
    /onMouseDown=\{\(e\)\s*=>\s*e\.preventDefault\(\)\}/,
    'Botões de formatação devem ter onMouseDown preventDefault para não perder a seleção no editor'
  );
  assert.match(
    content,
    /active:scale-\[0\.96\]/,
    'Botões devem ter feedback responsivo com active:scale-[0.96]'
  );

  // Alinhamento deve ser dedicado exclusivamente a alinhamento sem duplicar estilos
  assert.match(
    content,
    /Alinhamento do Texto/,
    'Menu de alinhamento deve ser dedicado exclusivamente ao alinhamento'
  );
});

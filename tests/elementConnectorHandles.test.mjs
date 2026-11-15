import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('ElementConnectorHandles: component exists and exports properly', () => {
  const file = readFileSync(join(__dirname, '../src/components/whiteboard/ElementConnectorHandles.tsx'), 'utf-8');
  assert.ok(file.includes('export const ElementConnectorHandles'));
  assert.ok(file.includes('onStartConnect'));
});

test('ElementConnectorHandles: contains 4 cardinal connection sides with accessible labels', () => {
  const file = readFileSync(join(__dirname, '../src/components/whiteboard/ElementConnectorHandles.tsx'), 'utf-8');
  assert.ok(file.includes("'top'"));
  assert.ok(file.includes("'right'"));
  assert.ok(file.includes("'bottom'"));
  assert.ok(file.includes("'left'"));
  assert.ok(file.includes('Conectar acima'));
  assert.ok(file.includes('Conectar à direita'));
  assert.ok(file.includes('Conectar abaixo'));
  assert.ok(file.includes('Conectar à esquerda'));
});

test('ElementConnectorHandles: follows Emil Kowalski transition and micro-interaction principles', () => {
  const file = readFileSync(join(__dirname, '../src/components/whiteboard/ElementConnectorHandles.tsx'), 'utf-8');
  // Transição rápida de escala no hover
  assert.ok(file.includes('transition-transform duration-150'));
  assert.ok(file.includes('cursor-crosshair'));
  // Fica invisível por padrão e surge no hover para manter o canvas limpo
  assert.ok(file.includes('opacity-0'));
  assert.ok(file.includes('group-hover:opacity-100'));
  // Utiliza a cor de seleção dinâmica e oculta em touch/mobile
  assert.ok(file.includes('selectionColor'));
  assert.ok(file.includes('isCoarseOrMobileViewport'));
});


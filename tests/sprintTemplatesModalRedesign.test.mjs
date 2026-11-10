import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relPath) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

test('SprintTemplatesModal redesign aligns with main screen QuickStartTemplatesStrip hierarchy and FigJam/Miro clean standards', () => {
  const modalSrc = readSource('src/components/whiteboard/SprintTemplatesModal.tsx');
  const stripSrc = readSource('src/components/whiteboard/QuickStartTemplatesStrip.tsx');
  const toolbarSrc = readSource('src/components/whiteboard/Toolbar.tsx');
  const boardPageSrc = readSource('src/pages/BoardPage.tsx');

  // 1. Reuses architectural SVG schematic preview from QuickStartTemplatesStrip
  assert.match(stripSrc, /export const TemplateSchematicPreview/);
  assert.match(modalSrc, /import \{ TemplateSchematicPreview \} from '\.\/QuickStartTemplatesStrip'/);
  assert.match(modalSrc, /<TemplateSchematicPreview variant=\{tmpl\.previewVariant\} \/>/);

  // 2. Uses same categories as the main screen
  assert.match(modalSrc, /TEMPLATE_CATEGORIES/);
  assert.match(modalSrc, /cat\.shortLabel/);

  // 3. Implements search filtering
  assert.match(modalSrc, /placeholder="Buscar template\.\.\."/);

  // 4. Follows Emil Kowalski design engineering principles
  assert.match(modalSrc, /active:scale-\[0\.9[78]\]/);
  assert.match(modalSrc, /cubic-bezier\(0\.23,\s*1,\s*0\.32,\s*1\)/);
  assert.match(modalSrc, /radial-gradient/);

  // 5. Clean FigJam-style card interaction (double click to insert direct + clear summary)
  assert.match(modalSrc, /onDoubleClick/);
  assert.match(modalSrc, /tmpl\.columns\.length/);
  assert.match(modalSrc, /selectedTemplate\.columns\.length/);
  assert.match(modalSrc, /Inserir no Quadro/);

  // 6. Industry alignment: Templates button available both in Navbar and Creation Toolbar
  assert.match(toolbarSrc, /onOpenTemplates/);
  assert.match(toolbarSrc, /LayoutTemplate/);
  assert.match(toolbarSrc, /aria-label="Inserir Templates de Sprint"/);
  assert.match(boardPageSrc, /onOpenTemplates=\{\(\) => setIsSprintTemplatesOpen\(true\)\}/);
});
